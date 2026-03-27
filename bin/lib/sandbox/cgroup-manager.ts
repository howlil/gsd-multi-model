/**
 * Cgroup Manager — Resource isolation via control groups
 *
 * Manages cgroup creation, configuration, and cleanup for sandboxed execution.
 * Supports both cgroup v1 and v2.
 *
 * Linux only - graceful degradation on Windows/macOS
 */

import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { defaultLogger as logger } from '../logger/index.js';

const execAsync = promisify(exec);

const CGROUP_V2_PATH = '/sys/fs/cgroup';
const CGROUP_V1_PATH = '/sys/fs/cgroup';
const EZ_AGENTS_CGROUP = 'ez-agents';

export interface CgroupConfig {
  taskId: string;
  memoryLimit: string;  // e.g., "1.5G"
  cpuQuota: number;     // e.g., 0.5 (50% of one CPU)
  pidLimit?: number;    // e.g., 100
}

export interface CgroupStats {
  memoryUsed: number;
  cpuUsed: number;
  pidCount: number;
}

/**
 * Check if cgroups are available
 */
export function isCgroupAvailable(): boolean {
  if (process.platform !== 'linux') {
    return false;
  }
  
  return existsSync(CGROUP_V2_PATH);
}

/**
 * Detect cgroup version
 */
export function getCgroupVersion(): 'v1' | 'v2' | null {
  if (process.platform !== 'linux') {
    return null;
  }
  
  try {
    // Check for cgroup v2 hierarchy
    const cgroupType = readFileSync(join(CGROUP_V2_PATH, 'cgroup.controllers'), 'utf8');
    if (cgroupType) {
      return 'v2';
    }
  } catch (err) {
    // Not v2, might be v1
  }
  
  try {
    // Check for cgroup v1
    if (existsSync(join(CGROUP_V1_PATH, 'memory'))) {
      return 'v1';
    }
  } catch (err) {
    // Neither v1 nor v2
  }
  
  return null;
}

/**
 * Initialize cgroup hierarchy for ez-agents
 */
export async function initCgroupHierarchy(): Promise<boolean> {
  if (!isCgroupAvailable()) {
    logger.warn('Cgroups not available, skipping initialization');
    return false;
  }
  
  const version = getCgroupVersion();
  if (!version) {
    logger.warn('Cgroup version not detected');
    return false;
  }
  
  try {
    const cgroupPath = join(CGROUP_V2_PATH, EZ_AGENTS_CGROUP);
    mkdirSync(cgroupPath, { recursive: true });
    logger.info('Cgroup hierarchy initialized', { path: cgroupPath, version });
    return true;
  } catch (err) {
    logger.error('Failed to initialize cgroup hierarchy', { 
      error: (err as Error).message,
      version 
    });
    return false;
  }
}

/**
 * Create cgroup for task
 */
export async function createCgroup(config: CgroupConfig): Promise<string> {
  if (!isCgroupAvailable()) {
    logger.debug('Cgroups not available, skipping creation');
    return '';
  }
  
  const version = getCgroupVersion();
  if (!version) {
    logger.debug('Cgroup version not detected');
    return '';
  }
  
  const cgroupPath = join(CGROUP_V2_PATH, EZ_AGENTS_CGROUP, config.taskId);
  
  try {
    // Create cgroup directory
    mkdirSync(cgroupPath, { recursive: true });
    
    // Set resource limits
    await setCgroupLimits(cgroupPath, config, version);
    
    logger.debug('Cgroup created', { 
      taskId: config.taskId, 
      path: cgroupPath,
      version 
    });
    
    return cgroupPath;
  } catch (err) {
    logger.error('Failed to create cgroup', { 
      taskId: config.taskId,
      error: (err as Error).message 
    });
    throw err;
  }
}

/**
 * Set cgroup resource limits
 */
async function setCgroupLimits(
  cgroupPath: string, 
  config: CgroupConfig, 
  version: 'v1' | 'v2'
): Promise<void> {
  if (version === 'v2') {
    await setCgroupV2Limits(cgroupPath, config);
  } else {
    await setCgroupV1Limits(cgroupPath, config);
  }
}

/**
 * Set cgroup v2 limits
 */
async function setCgroupV2Limits(cgroupPath: string, config: CgroupConfig): Promise<void> {
  try {
    // Set memory limit
    const memoryFile = join(cgroupPath, 'memory.max');
    writeFileSync(memoryFile, config.memoryLimit);
    
    // Set CPU quota (microseconds per 100ms period)
    const cpuFile = join(cgroupPath, 'cpu.max');
    const cpuQuota = Math.round(config.cpuQuota * 100000);
    writeFileSync(cpuFile, `${cpuQuota} 100000`);
    
    // Set PID limit if specified
    if (config.pidLimit) {
      const pidsFile = join(cgroupPath, 'pids.max');
      writeFileSync(pidsFile, config.pidLimit.toString());
    }
    
    logger.debug('Cgroup v2 limits set', { 
      path: cgroupPath,
      memory: config.memoryLimit,
      cpu: config.cpuQuota 
    });
  } catch (err) {
    logger.warn('Failed to set cgroup v2 limits', { 
      path: cgroupPath,
      error: (err as Error).message 
    });
  }
}

/**
 * Set cgroup v1 limits
 */
async function setCgroupV1Limits(cgroupPath: string, config: CgroupConfig): Promise<void> {
  try {
    // Set memory limit (in bytes)
    const memoryBytes = parseMemoryLimit(config.memoryLimit);
    const memoryFile = join(cgroupPath, 'memory', 'memory.limit_in_bytes');
    if (existsSync(memoryFile)) {
      writeFileSync(memoryFile, memoryBytes.toString());
    }
    
    // Set CPU quota
    const cpuFile = join(cgroupPath, 'cpu', 'cpu.cfs_quota_us');
    if (existsSync(cpuFile)) {
      const cpuQuota = Math.round(config.cpuQuota * 100000);
      writeFileSync(cpuFile, cpuQuota.toString());
    }
    
    logger.debug('Cgroup v1 limits set', { 
      path: cgroupPath,
      memory: config.memoryLimit,
      cpu: config.cpuQuota 
    });
  } catch (err) {
    logger.warn('Failed to set cgroup v1 limits', { 
      path: cgroupPath,
      error: (err as Error).message 
    });
  }
}

/**
 * Parse memory limit string to bytes
 */
function parseMemoryLimit(limit: string): number {
  const match = limit.match(/^(\d+(?:\.\d+)?)([KMGT]?)$/);
  if (!match) {
    return 1024 * 1024 * 1024; // Default 1GB
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'K': return Math.round(value * 1024);
    case 'M': return Math.round(value * 1024 * 1024);
    case 'G': return Math.round(value * 1024 * 1024 * 1024);
    case 'T': return Math.round(value * 1024 * 1024 * 1024 * 1024);
    default: return Math.round(value);
  }
}

/**
 * Get cgroup statistics
 */
export async function getCgroupStats(cgroupPath: string): Promise<CgroupStats> {
  if (!existsSync(cgroupPath)) {
    return { memoryUsed: 0, cpuUsed: 0, pidCount: 0 };
  }
  
  const version = getCgroupVersion();
  
  try {
    if (version === 'v2') {
      return getCgroupV2Stats(cgroupPath);
    } else if (version === 'v1') {
      return getCgroupV1Stats(cgroupPath);
    }
  } catch (err) {
    logger.warn('Failed to get cgroup stats', { 
      path: cgroupPath,
      error: (err as Error).message 
    });
  }
  
  return { memoryUsed: 0, cpuUsed: 0, pidCount: 0 };
}

/**
 * Get cgroup v2 statistics
 */
async function getCgroupV2Stats(cgroupPath: string): Promise<CgroupStats> {
  const stats: CgroupStats = { memoryUsed: 0, cpuUsed: 0, pidCount: 0 };
  
  try {
    // Get memory usage
    const memoryFile = join(cgroupPath, 'memory.current');
    if (existsSync(memoryFile)) {
      const memory = parseInt(readFileSync(memoryFile, 'utf8'), 10);
      stats.memoryUsed = memory;
    }
    
    // Get CPU usage
    const cpuFile = join(cgroupPath, 'cpu.stat');
    if (existsSync(cpuFile)) {
      const cpuStat = readFileSync(cpuFile, 'utf8');
      const match = cpuStat.match(/usage_usec\s+(\d+)/);
      if (match) {
        stats.cpuUsed = parseInt(match[1], 10) / 1000; // Convert to ms
      }
    }
    
    // Get PID count
    const pidsFile = join(cgroupPath, 'pids.current');
    if (existsSync(pidsFile)) {
      stats.pidCount = parseInt(readFileSync(pidsFile, 'utf8'), 10);
    }
  } catch (err) {
    logger.debug('Failed to read cgroup v2 stats', { error: (err as Error).message });
  }
  
  return stats;
}

/**
 * Get cgroup v1 statistics
 */
async function getCgroupV1Stats(cgroupPath: string): Promise<CgroupStats> {
  const stats: CgroupStats = { memoryUsed: 0, cpuUsed: 0, pidCount: 0 };
  
  try {
    // Get memory usage
    const memoryFile = join(cgroupPath, 'memory', 'memory.usage_in_bytes');
    if (existsSync(memoryFile)) {
      stats.memoryUsed = parseInt(readFileSync(memoryFile, 'utf8'), 10);
    }
    
    // Get CPU usage
    const cpuFile = join(cgroupPath, 'cpu', 'cpu.stat');
    if (existsSync(cpuFile)) {
      const cpuStat = readFileSync(cpuFile, 'utf8');
      const match = cpuStat.match(/nr_throttled\s+(\d+)/);
      if (match) {
        stats.cpuUsed = parseInt(match[1], 10);
      }
    }
  } catch (err) {
    logger.debug('Failed to read cgroup v1 stats', { error: (err as Error).message });
  }
  
  return stats;
}

/**
 * Delete cgroup
 */
export async function deleteCgroup(cgroupPath: string): Promise<void> {
  if (!existsSync(cgroupPath)) {
    return;
  }
  
  try {
    rmSync(cgroupPath, { recursive: true, force: true });
    logger.debug('Cgroup deleted', { path: cgroupPath });
  } catch (err) {
    logger.warn('Failed to delete cgroup', { 
      path: cgroupPath,
      error: (err as Error).message 
    });
  }
}

/**
 * Run command in cgroup
 */
export async function runInCgroup(
  cgroupPath: string,
  command: string,
  options: { cwd?: string; env?: Record<string, string>; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  const version = getCgroupVersion();
  
  if (!version || !isCgroupAvailable()) {
    // Fallback to regular execution
    return execAsync(command, options as any);
  }
  
  // Use cgexec for cgroup v1, or systemd-run for v2
  const cgexecCmd = version === 'v1' 
    ? `cgexec -g memory,cpu:${cgroupPath} ${command}`
    : `systemd-run --scope -p MemoryMax=${readFileSync(join(cgroupPath, 'memory.max'), 'utf8')} ${command}`;
  
  return execAsync(cgexecCmd, options as any);
}
