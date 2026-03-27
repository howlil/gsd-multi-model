/**
 * Workspace Manager — Ephemeral workspace management for sandboxed execution
 *
 * Creates isolated workspaces per task with proper permissions.
 * Read-only by default, writable mounts for .planning/ and src/.
 *
 * Overhead: 500ms copy time (acceptable for security)
 */

import { mkdirSync, rmSync, existsSync, copyFileSync, statSync, chmodSync } from 'fs';
import { join, relative } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { defaultLogger as logger } from '../logger/index.js';

const execAsync = promisify(exec);

const WORKSPACE_BASE = join(process.cwd(), '.planning', 'workspaces');
const BASE_WORKSPACE = join(process.cwd(), '.planning', 'workspace-template');

export interface WorkspaceConfig {
  taskId: string;
  agentType: string;
  readOnly?: boolean;
  writablePaths?: string[];
}

export interface WorkspaceInfo {
  path: string;
  taskId: string;
  agentType: string;
  createdAt: number;
  sizeBytes: number;
  fileCount: number;
}

/**
 * Initialize workspace base directory
 */
export function initWorkspaceBase(): void {
  try {
    if (!existsSync(WORKSPACE_BASE)) {
      mkdirSync(WORKSPACE_BASE, { recursive: true });
      logger.debug('Workspace base directory initialized', { path: WORKSPACE_BASE });
    }
    
    // Create template if it doesn't exist
    if (!existsSync(BASE_WORKSPACE)) {
      createBaseTemplate();
    }
  } catch (err) {
    logger.warn('Failed to initialize workspace base', { error: (err as Error).message });
  }
}

/**
 * Create base workspace template
 */
function createBaseTemplate(): void {
  try {
    mkdirSync(BASE_WORKSPACE, { recursive: true });
    
    // Create standard directories
    const dirs = ['.planning', 'src', 'tests', 'docs', 'tmp'];
    for (const dir of dirs) {
      mkdirSync(join(BASE_WORKSPACE, dir), { recursive: true });
    }
    
    // Create .gitignore
    const gitignore = join(BASE_WORKSPACE, '.gitignore');
    require('fs').writeFileSync(gitignore, `
# Workspace files
*.log
.tmp/
.cache/

# Dependencies
node_modules/

# Build output
dist/
build/
`, 'utf8');
    
    logger.debug('Base workspace template created', { path: BASE_WORKSPACE });
  } catch (err) {
    logger.warn('Failed to create base template', { error: (err as Error).message });
  }
}

/**
 * Create ephemeral workspace for task
 */
export async function createWorkspace(config: WorkspaceConfig): Promise<string> {
  initWorkspaceBase();
  
  const workspacePath = join(WORKSPACE_BASE, config.taskId);
  
  try {
    // Copy base template
    await copyDirectory(BASE_WORKSPACE, workspacePath);
    
    // Set permissions
    await setWorkspacePermissions(workspacePath, config);
    
    logger.info('Workspace created', {
      taskId: config.taskId,
      agentType: config.agentType,
      path: workspacePath
    });
    
    return workspacePath;
  } catch (err) {
    logger.error('Failed to create workspace', {
      taskId: config.taskId,
      error: (err as Error).message
    });
    throw err;
  }
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  try {
    // Use xcopy on Windows for faster copying
    if (process.platform === 'win32') {
      await execAsync(`xcopy /E /I /Y "${src}\\*" "${dest}"`);
    } else {
      // Use cp on Unix
      await execAsync(`cp -r "${src}/." "${dest}/"`);
    }
    
    logger.debug('Directory copied', { src, dest });
  } catch (err) {
    // Fallback to manual copy
    await copyDirectoryManual(src, dest);
  }
}

/**
 * Manual directory copy (fallback)
 */
async function copyDirectoryManual(src: string, dest: string): Promise<void> {
  mkdirSync(dest, { recursive: true });
  
  const entries = await execAsync(`dir /b "${src}"`, { encoding: 'utf8' });
  const files = entries.stdout.trim().split('\n').filter(f => f.length > 0);
  
  for (const file of files) {
    const srcPath = join(src, file);
    const destPath = join(dest, file);
    
    try {
      const stats = statSync(srcPath);
      
      if (stats.isDirectory()) {
        await copyDirectoryManual(srcPath, destPath);
      } else {
        copyFileSync(srcPath, destPath);
      }
    } catch (err) {
      logger.warn('Failed to copy file', { src: srcPath, dest: destPath });
    }
  }
}

/**
 * Set workspace permissions
 */
async function setWorkspacePermissions(workspacePath: string, config: WorkspaceConfig): Promise<void> {
  try {
    // Default: read-only
    if (!config.readOnly && process.platform !== 'win32') {
      chmodSync(workspacePath, 0o555);  // Read-only
      
      // Writable paths
      const writablePaths = config.writablePaths || ['.planning', 'src', 'tmp'];
      for (const writablePath of writablePaths) {
        const fullPath = join(workspacePath, writablePath);
        if (existsSync(fullPath)) {
          chmodSync(fullPath, 0o755);  // Read-write-execute
        }
      }
    }
    
    logger.debug('Workspace permissions set', {
      path: workspacePath,
      readOnly: config.readOnly,
      writablePaths: config.writablePaths
    });
  } catch (err) {
    logger.warn('Failed to set workspace permissions', {
      path: workspacePath,
      error: (err as Error).message
    });
  }
}

/**
 * Get workspace info
 */
export async function getWorkspaceInfo(workspacePath: string): Promise<WorkspaceInfo | null> {
  try {
    if (!existsSync(workspacePath)) {
      return null;
    }
    
    const stats = await getDirectoryStats(workspacePath);
    
    // Extract task ID from path
    const taskId = relative(WORKSPACE_BASE, workspacePath).split(/[\\/]/)[0];
    
    return {
      path: workspacePath,
      taskId: taskId || 'unknown',
      agentType: 'unknown',
      createdAt: statSync(workspacePath).mtime.getTime(),
      sizeBytes: stats.sizeBytes,
      fileCount: stats.fileCount
    };
  } catch (err) {
    logger.warn('Failed to get workspace info', {
      path: workspacePath,
      error: (err as Error).message
    });
    return null;
  }
}

/**
 * Get directory statistics
 */
async function getDirectoryStats(dirPath: string): Promise<{ sizeBytes: number; fileCount: number }> {
  let sizeBytes = 0;
  let fileCount = 0;
  
  try {
    const entries = await execAsync(`dir /s /b "${dirPath}"`, { encoding: 'utf8' });
    const files = entries.stdout.trim().split('\n').filter(f => f.length > 0 && !f.includes('File(s)'));
    
    for (const file of files) {
      try {
        const stats = statSync(file);
        if (stats.isFile()) {
          sizeBytes += stats.size;
          fileCount++;
        }
      } catch (err) {
        // Skip inaccessible files
      }
    }
  } catch (err) {
    logger.debug('Failed to get directory stats', { error: (err as Error).message });
  }
  
  return { sizeBytes, fileCount };
}

/**
 * Cleanup workspace
 */
export async function cleanupWorkspace(workspacePath: string): Promise<void> {
  try {
    if (existsSync(workspacePath)) {
      rmSync(workspacePath, { recursive: true, force: true });
      logger.debug('Workspace cleaned up', { path: workspacePath });
    }
  } catch (err) {
    logger.warn('Failed to cleanup workspace', {
      path: workspacePath,
      error: (err as Error).message
    });
  }
}

/**
 * List active workspaces
 */
export async function listWorkspaces(): Promise<WorkspaceInfo[]> {
  initWorkspaceBase();
  
  const workspaces: WorkspaceInfo[] = [];
  
  try {
    if (!existsSync(WORKSPACE_BASE)) {
      return workspaces;
    }
    
    const entries = await execAsync(`dir /b "${WORKSPACE_BASE}"`, { encoding: 'utf8' });
    const dirs = entries.stdout.trim().split('\n').filter(f => f.length > 0);
    
    for (const dir of dirs) {
      const workspacePath = join(WORKSPACE_BASE, dir);
      const info = await getWorkspaceInfo(workspacePath);
      
      if (info) {
        workspaces.push(info);
      }
    }
  } catch (err) {
    logger.warn('Failed to list workspaces', { error: (err as Error).message });
  }
  
  return workspaces;
}

/**
 * Get total workspace usage
 */
export async function getWorkspaceUsage(): Promise<{ totalBytes: number; workspaceCount: number }> {
  const workspaces = await listWorkspaces();
  
  const totalBytes = workspaces.reduce((sum, ws) => sum + ws.sizeBytes, 0);
  
  return {
    totalBytes,
    workspaceCount: workspaces.length
  };
}

/**
 * Cleanup old workspaces (older than maxAge)
 */
export async function cleanupOldWorkspaces(maxAgeMs: number = 3600000): Promise<number> {
  const workspaces = await listWorkspaces();
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const ws of workspaces) {
    const age = now - ws.createdAt;
    
    if (age > maxAgeMs) {
      await cleanupWorkspace(ws.path);
      cleanedCount++;
      logger.debug('Cleaned up old workspace', {
        taskId: ws.taskId,
        age: Math.round(age / 60000) + 'm'
      });
    }
  }
  
  if (cleanedCount > 0) {
    logger.info('Old workspaces cleaned up', { count: cleanedCount });
  }
  
  return cleanedCount;
}
