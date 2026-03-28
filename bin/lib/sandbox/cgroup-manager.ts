/**
 * Cgroup Manager — Resource isolation via control groups and Docker
 *
 * Manages resource limits for sandboxed execution:
 * - Cgroup v1/v2 for Linux native execution
 * - Docker resource limits for containerized execution
 * - Graceful degradation on Windows/macOS
 *
 * Supports:
 * - CPU limits (SANDBOX-02)
 * - Memory limits (SANDBOX-03)
 * - PID limits
 * - Resource monitoring
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

// ============================================================================
// Type Definitions
// ============================================================================

export interface CgroupConfig {
  taskId: string;
  memoryLimit: string;  // e.g., "1.5G"
  cpuQuota: number;     // e.g., 0.5 (50% of one CPU)
  pidLimit?: number;    // e.g., 100
}

export interface DockerResourceLimits {
  cpus?: number;        // Number of CPUs (e.g., 0.5, 1.0, 2.0)
  memory?: string;      // Memory limit (e.g., "512m", "1g", "2g")
  memoryReservation?: string;  // Soft limit
  memorySwap?: string;  // Memory + swap limit
  pidsLimit?: number;   // Max number of processes
  shmSize?: string;     // Shared memory size (e.g., "64m")
  cpuShares?: number;   // CPU weight (relative)
  cpuPeriod?: number;   // CPU CFS period (microseconds)
  cpuQuotaUs?: number;  // CPU CFS quota (microseconds)
}

export interface CgroupStats {
  memoryUsed: number;
  cpuUsed: number;
  pidCount: number;
  memoryLimit: number;
  cpuLimit: number;
}

export interface ResourceUsage {
  taskId: string;
  timestamp: number;
  memoryBytes: number;
  cpuPercent: number;
  pidCount: number;
  ioReadBytes?: number;
  ioWriteBytes?: number;
  networkRxBytes?: number;
  networkTxBytes?: number;
}

// ============================================================================
// Cgroup Detection & Initialization
// ============================================================================

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

// ============================================================================
// Cgroup Management
// ============================================================================

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
  const match = limit.match(/^(\d+(?:\.\d+)?)([KMGT]?)$/i);
  if (!match) {
    return 1024 * 1024 * 1024; // Default 1GB
  }

  const value = parseFloat(match[1]);
  const unit = match[2]?.toUpperCase();

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
    return { memoryUsed: 0, cpuUsed: 0, pidCount: 0, memoryLimit: 0, cpuLimit: 0 };
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

  return { memoryUsed: 0, cpuUsed: 0, pidCount: 0, memoryLimit: 0, cpuLimit: 0 };
}

/**
 * Get cgroup v2 statistics
 */
async function getCgroupV2Stats(cgroupPath: string): Promise<CgroupStats> {
  const stats: CgroupStats = {
    memoryUsed: 0,
    cpuUsed: 0,
    pidCount: 0,
    memoryLimit: 0,
    cpuLimit: 0
  };

  try {
    // Get memory usage
    const memoryFile = join(cgroupPath, 'memory.current');
    if (existsSync(memoryFile)) {
      const memory = parseInt(readFileSync(memoryFile, 'utf8'), 10);
      stats.memoryUsed = memory;
    }

    // Get memory limit
    const memoryMaxFile = join(cgroupPath, 'memory.max');
    if (existsSync(memoryMaxFile)) {
      const limit = readFileSync(memoryMaxFile, 'utf8').trim();
      if (limit !== 'max') {
        stats.memoryLimit = parseInt(limit, 10);
      }
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
  const stats: CgroupStats = {
    memoryUsed: 0,
    cpuUsed: 0,
    pidCount: 0,
    memoryLimit: 0,
    cpuLimit: 0
  };

  try {
    // Get memory usage
    const memoryFile = join(cgroupPath, 'memory', 'memory.usage_in_bytes');
    if (existsSync(memoryFile)) {
      stats.memoryUsed = parseInt(readFileSync(memoryFile, 'utf8'), 10);
    }

    // Get memory limit
    const memoryLimitFile = join(cgroupPath, 'memory', 'memory.limit_in_bytes');
    if (existsSync(memoryLimitFile)) {
      stats.memoryLimit = parseInt(readFileSync(memoryLimitFile, 'utf8'), 10);
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

// ============================================================================
// Docker Resource Limits
// ============================================================================

/**
 * Build Docker run command with resource limits
 */
export function buildDockerRunCommand(
  image: string,
  command: string,
  limits: DockerResourceLimits,
  options: {
    name?: string;
    env?: Record<string, string>;
    volumes?: string[];
    network?: string;
    workDir?: string;
    detach?: boolean;
  } = {}
): string {
  const args: string[] = ['docker run'];

  // Container name
  if (options.name) {
    args.push(`--name ${options.name}`);
  }

  // Always remove container on exit
  args.push('--rm');

  // CPU limits
  if (limits.cpus !== undefined) {
    args.push(`--cpus="${limits.cpus}"`);
  }
  if (limits.cpuShares !== undefined) {
    args.push(`--cpu-shares ${limits.cpuShares}`);
  }
  if (limits.cpuPeriod !== undefined && limits.cpuQuotaUs !== undefined) {
    args.push(`--cpu-period ${limits.cpuPeriod} --cpu-quota ${limits.cpuQuotaUs}`);
  }

  // Memory limits
  if (limits.memory !== undefined) {
    args.push(`--memory="${limits.memory}"`);
  }
  if (limits.memoryReservation !== undefined) {
    args.push(`--memory-reservation="${limits.memoryReservation}"`);
  }
  if (limits.memorySwap !== undefined) {
    args.push(`--memory-swap="${limits.memorySwap}"`);
  }
  if (limits.shmSize !== undefined) {
    args.push(`--shm-size="${limits.shmSize}"`);
  }

  // PID limit
  if (limits.pidsLimit !== undefined) {
    args.push(`--pids-limit=${limits.pidsLimit}`);
  }

  // Network
  if (options.network) {
    args.push(`--network=${options.network}`);
  }

  // Working directory
  if (options.workDir) {
    args.push(`--workdir ${options.workDir}`);
  }

  // Volumes
  if (options.volumes) {
    for (const vol of options.volumes) {
      args.push(`--volume "${vol}"`);
    }
  }

  // Environment variables
  if (options.env) {
    for (const [key, value] of Object.entries(options.env)) {
      args.push(`--env ${key}="${value}"`);
    }
  }

  // Detached mode
  if (options.detach) {
    args.push('--detach');
  }

  // Image and command
  args.push(image);
  args.push(command);

  return args.join(' ');
}

/**
 * Get Docker container resource usage
 */
export async function getContainerResourceUsage(
  containerId: string
): Promise<ResourceUsage | null> {
  try {
    // Get container stats
    const { stdout } = await execAsync(
      `docker stats --no-stream --format '{{.MemUsage}}|{{.CPUPerc}}|{{.PIDs}}' ${containerId}`
    );

    const [memUsage, cpuPercent, pids] = stdout.trim().split('|');

    // Parse memory usage (e.g., "125.5MiB / 1GiB")
    const memMatch = memUsage.match(/([\d.]+)([KMGT]?)i?B/);
    const memoryBytes = memMatch ? parseMemoryLimit(memMatch[1] + (memMatch[2] || 'M')) : 0;

    // Parse CPU percentage (e.g., "0.50%")
    const cpuPercentNum = parseFloat(cpuPercent.replace('%', '')) || 0;

    // Parse PID count
    const pidCount = parseInt(pids, 10) || 0;

    return {
      taskId: containerId,
      timestamp: Date.now(),
      memoryBytes,
      cpuPercent: cpuPercentNum,
      pidCount
    };
  } catch (err) {
    logger.warn('Failed to get container resource usage', {
      containerId,
      error: (err as Error).message
    });
    return null;
  }
}

/**
 * Monitor container resources
 */
export async function monitorContainerResources(
  containerId: string,
  intervalMs: number = 5000,
  callback?: (usage: ResourceUsage) => void
): Promise<NodeJS.Timeout> {
  const timer = setInterval(async () => {
    const usage = await getContainerResourceUsage(containerId);
    if (usage && callback) {
      callback(usage);
    }
  }, intervalMs);

  return timer;
}

// ============================================================================
// Resource Limit Utilities
// ============================================================================

/**
 * Convert memory string to bytes
 */
export function memoryToBytes(memory: string): number {
  return parseMemoryLimit(memory);
}

/**
 * Convert bytes to human-readable memory string
 */
export function bytesToMemory(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let value = bytes;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)}${units[unitIndex]}`;
}

/**
 * Validate resource limits
 */
export function validateResourceLimits(limits: DockerResourceLimits): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate CPU limits
  if (limits.cpus !== undefined && (limits.cpus <= 0 || limits.cpus > 128)) {
    errors.push('CPU limit must be between 0 and 128');
  }

  // Validate memory limits
  if (limits.memory !== undefined) {
    const bytes = memoryToBytes(limits.memory);
    if (bytes < 4 * 1024 * 1024) {  // Minimum 4MB
      errors.push('Memory limit must be at least 4MB');
    }
  }

  // Validate PID limits
  if (limits.pidsLimit !== undefined && limits.pidsLimit < 1) {
    errors.push('PID limit must be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get default resource limits for agent type
 */
export function getDefaultLimits(agentType: string): DockerResourceLimits {
  const defaults: Record<string, DockerResourceLimits> = {
    'planner': { cpus: 0.5, memory: '1g', pidsLimit: 50 },
    'executor': { cpus: 1, memory: '1.5g', pidsLimit: 100 },
    'verifier': { cpus: 0.25, memory: '512m', pidsLimit: 25 },
    'researcher': { cpus: 0.5, memory: '1g', pidsLimit: 50, shmSize: '64m' }
  };

  return defaults[agentType] || { cpus: 0.5, memory: '1g', pidsLimit: 50 };
}
