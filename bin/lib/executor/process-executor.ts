/**
 * Process Executor Utility
 *
 * Provides type-safe process execution with proper error handling.
 */

import {
  spawn,
  type SpawnOptions,
  type ChildProcessWithoutNullStreams
} from 'child_process';
import type { StateManager } from '../state/state-manager.js';
import { defaultLogger as logger } from '../logger/index.js';

export interface ProcessResult {
  success: boolean;
  output: string;
  code: number | null;
  checkpointId?: string;
}

export interface ExecutorOptions extends SpawnOptions {
  timeout?: number;
  // Checkpoint options
  createCheckpoint?: boolean;
  checkpointBeforeExec?: boolean;
  checkpointAfterSuccess?: boolean;
  stateManager?: StateManager;
  taskId?: string;
  agentId?: string;
}

/**
 * Spawn a process with proper types
 */
export function spawnProcess(
  cmd: string,
  args: string[],
  options: SpawnOptions = {}
): ChildProcessWithoutNullStreams {
  const proc = spawn(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  }) as ChildProcessWithoutNullStreams;

  return proc;
}

/**
 * Execute command and capture output
 */
export async function executeProcess(
  cmd: string,
  args: string[],
  options: ExecutorOptions = {}
): Promise<ProcessResult> {
  const timeout = options.timeout ?? 300000;

  // Pre-execution checkpoint
  if (options.createCheckpoint && options.checkpointBeforeExec && 
      options.stateManager && options.taskId) {
    try {
      await options.stateManager.createTaskCheckpoint(
        options.taskId,
        options.agentId || 'executor'
      );
      logger.debug(`Pre-execution checkpoint created for task ${options.taskId}`);
    } catch (error) {
      logger.warn(`Failed to create pre-execution checkpoint: ${error}`);
      // Don't block execution
    }
  }

  return new Promise((resolve, reject) => {
    const proc = spawnProcess(cmd, args, options);
    let output = '';

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Process timeout after ${timeout}ms`));
    }, timeout);

    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      output += data.toString();
    });

    proc.on('close', async (code) => {
      clearTimeout(timer);
      
      const result: ProcessResult = {
        success: code === 0,
        output,
        code
      };

      // Post-execution checkpoint on success
      if (options.createCheckpoint && options.checkpointAfterSuccess && 
          options.stateManager && options.taskId && code === 0) {
        try {
          const checkpointId = await options.stateManager.createTaskCheckpoint(
            options.taskId,
            options.agentId || 'executor'
          );
          logger.debug(`Post-execution checkpoint created for task ${options.taskId}: ${checkpointId}`);
          result.checkpointId = checkpointId;
        } catch (error) {
          logger.warn(`Failed to create post-execution checkpoint: ${error}`);
          // Don't block result
        }
      }

      resolve(result);
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Create checkpoint on phase completion
 *
 * @param phase - Phase number
 * @param stateManager - StateManager instance
 * @param agentId - Agent identifier
 * @returns Checkpoint ID or null on failure
 */
export async function createPhaseCheckpointOnComplete(
  phase: number,
  stateManager: StateManager,
  agentId: string
): Promise<string | null> {
  try {
    const checkpointId = await stateManager.createPhaseCheckpoint(phase, agentId);
    logger.info(`Phase ${phase} checkpoint created: ${checkpointId}`);
    return checkpointId;
  } catch (error) {
    logger.warn(`Failed to create phase checkpoint: ${error}`);
    return null;
  }
}
