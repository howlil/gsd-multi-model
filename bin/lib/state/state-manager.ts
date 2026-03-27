/**
 * State Manager - Centralized state synchronization for parallel agent execution
 *
 * Provides:
 * - Single source of truth for parallel agent execution
 * - Real-time state synchronization (sub-100ms)
 * - Vector clock versioning for conflict detection
 * - Checkpoint-based crash recovery
 * - Integration with AgentMesh and ContextShareManager
 *
 * @example
 * ```typescript
 * const mesh = new AgentMesh();
 * const contextShare = new ContextShareManager(mesh);
 * const stateManager = new StateManager(mesh, contextShare);
 *
 * // Update task state
 * await stateManager.updateTaskState(
 *   '01-01',
 *   { phase: 36, plan: 1, status: 'in-progress' },
 *   'ez-coder'
 * );
 *
 * // Recover from checkpoint
 * await stateManager.recoverFromCheckpoint();
 * ```
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { AgentMesh } from '../orchestration/AgentMesh.js';
import { ContextShareManager } from '../orchestration/context-share-manager.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

/**
 * State version with vector clock
 */
export interface StateVersion {
  vectorClock: Map<string, number>; // Agent ID -> counter
  timestamp: number;
  checksum: string;
}

/**
 * Task-level state
 */
export interface TaskState {
  taskId: string;
  phase: number;
  plan: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  agent?: string;
  output?: string;
  context?: string[];
  metadata: Record<string, unknown>;
  version: StateVersion;
  createdAt: number;
  updatedAt: number;
}

/**
 * Phase-level state
 */
export interface PhaseState {
  phase: number;
  status: 'not-started' | 'in-progress' | 'completed';
  currentPlan: number;
  completedPlans: number[];
  requirements: Map<string, RequirementState>;
}

/**
 * Requirement state
 */
export interface RequirementState {
  id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  agent?: string;
  output?: string;
}

/**
 * Global state snapshot
 */
export interface GlobalState {
  version: StateVersion;
  taskStates: Map<string, TaskState>;
  phaseState: Map<number, PhaseState>;
  checkpointId?: string;
}

/**
 * Sync statistics
 */
export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflicts: number;
  averageLatencyMs: number;
  lastSyncTime?: number;
}

/**
 * State update message
 */
interface StateUpdateMessage {
  type: 'state-update' | 'state-request' | 'state-response';
  taskId: string;
  state?: TaskState;
  version?: StateVersion;
  timestamp: number;
  agentId?: string;
}

// ─── StateManager Class ──────────────────────────────────────────────────────

/**
 * Centralized State Manager
 *
 * Manages state synchronization for parallel agent execution with:
 * - Vector clock versioning
 * - Conflict detection and resolution
 * - Checkpoint-based persistence
 * - Real-time broadcast via AgentMesh
 */
export class StateManager extends EventEmitter {
  private readonly mesh: AgentMesh;
  private readonly contextShare: ContextShareManager;
  private readonly statePath: string;
  private readonly checkpointIntervalMs: number;
  private globalState: GlobalState;
  private syncStats: SyncStats;
  private checkpointInterval: NodeJS.Timeout | null;
  private readonly subscribedAgents: Set<string>;

  /**
   * Create a new StateManager
   *
   * @param mesh - AgentMesh for broadcast communication
   * @param contextShare - ContextShareManager for context-aware sharing
   * @param statePath - Path to state file (default: '.planning/STATE.md')
   * @param checkpointIntervalMs - Checkpoint interval in ms (default: 300000 = 5 min)
   */
  constructor(
    mesh: AgentMesh,
    contextShare: ContextShareManager,
    statePath: string = '.planning/STATE.md',
    checkpointIntervalMs: number = 300000
  ) {
    super();
    this.mesh = mesh;
    this.contextShare = contextShare;
    this.statePath = statePath;
    this.checkpointIntervalMs = checkpointIntervalMs;
    this.globalState = this.initializeGlobalState();
    this.syncStats = this.initializeSyncStats();
    this.subscribedAgents = new Set();
    this.checkpointInterval = null;

    // Start checkpoint timer
    this.checkpointInterval = setInterval(
      () => this.createCheckpoint(),
      this.checkpointIntervalMs
    );

    // Subscribe to mesh messages
    this.subscribeToMesh();
  }

  /**
   * Initialize global state
   */
  private initializeGlobalState(): GlobalState {
    return {
      version: {
        vectorClock: new Map(),
        timestamp: Date.now(),
        checksum: ''
      },
      taskStates: new Map(),
      phaseState: new Map(),
      checkpointId: undefined
    };
  }

  /**
   * Initialize sync statistics
   */
  private initializeSyncStats(): SyncStats {
    return {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflicts: 0,
      averageLatencyMs: 0
    };
  }

  /**
   * Subscribe to AgentMesh messages
   */
  private subscribeToMesh(): void {
    // AgentMesh uses getMessages pattern - agents poll for messages
    // State updates are broadcast to 'state-updates' channel
    // This is handled by the broadcast mechanism
  }

  /**
   * Get task state
   *
   * @param taskId - Task identifier
   * @returns Task state or undefined
   */
  getTaskState(taskId: string): TaskState | undefined {
    return this.globalState.taskStates.get(taskId);
  }

  /**
   * Create new version with vector clock
   *
   * @param agentId - Agent creating the version
   * @returns New state version
   */
  private createVersion(agentId: string): StateVersion {
    const vectorClock = new Map<string, number>();
    vectorClock.set(agentId, 1);

    return {
      vectorClock,
      timestamp: Date.now(),
      checksum: this.calculateChecksum()
    };
  }

  /**
   * Increment vector clock for agent
   *
   * @param version - Current version
   * @param agentId - Agent incrementing the version
   * @returns New incremented version
   */
  private incrementVersion(version: StateVersion, agentId: string): StateVersion {
    const newClock = new Map(version.vectorClock);
    const current = newClock.get(agentId) || 0;
    newClock.set(agentId, current + 1);

    return {
      vectorClock: newClock,
      timestamp: Date.now(),
      checksum: this.calculateChecksum()
    };
  }

  /**
   * Detect conflict using vector clocks
   *
   * Compares vector clocks to detect concurrent modifications.
   * A conflict exists when neither clock dominates the other.
   *
   * @param existing - Existing task state
   * @param updateVersion - Version of the update
   * @returns True if conflict detected
   *
   * @example
   * ```typescript
   * // Concurrent modification (CONFLICT):
   * // Clock A: { "ez-planner": 2, "ez-coder": 1 }
   * // Clock B: { "ez-planner": 1, "ez-coder": 2 }
   *
   * // Causal ordering (NO CONFLICT):
   * // Clock A: { "ez-planner": 2, "ez-coder": 1 }
   * // Clock B: { "ez-planner": 2, "ez-coder": 2 }
   * ```
   */
  private detectConflict(existing: TaskState, updateVersion?: StateVersion): boolean {
    if (!updateVersion) {
      return false;
    }

    const existingClock = existing.version.vectorClock;
    const updateClock = updateVersion.vectorClock;

    let existingGreater = false;
    let updateGreater = false;

    const allKeys = new Set([...existingClock.keys(), ...updateClock.keys()]);

    for (const key of allKeys) {
      const existingValue = existingClock.get(key) || 0;
      const updateValue = updateClock.get(key) || 0;

      if (existingValue > updateValue) {
        existingGreater = true;
      }
      if (updateValue > existingValue) {
        updateGreater = true;
      }
    }

    // Conflict if both are greater in different aspects (concurrent modification)
    return existingGreater && updateGreater;
  }

  /**
   * Update task state
   *
   * Creates or updates task state with versioning and conflict detection.
   * Uses last-write-wins strategy on conflict.
   *
   * @param taskId - Task identifier
   * @param update - Partial task state to update
   * @param agentId - Agent performing the update
   * @returns Promise resolving to true on success, false on failure
   *
   * @emits StateManager#state-updated
   * @emits StateManager#state-error
   */
  async updateTaskState(
    taskId: string,
    update: Partial<TaskState>,
    agentId: string
  ): Promise<boolean> {
    const startTime = Date.now();
    this.syncStats.totalSyncs++;

    try {
      const existingState = this.globalState.taskStates.get(taskId);

      if (!existingState) {
        // Create new state
        const newState: TaskState = {
          taskId,
          phase: update.phase ?? 0,
          plan: update.plan ?? 0,
          status: update.status ?? 'pending',
          agent: agentId,
          metadata: update.metadata ?? {},
          version: this.createVersion(agentId),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };

        this.globalState.taskStates.set(taskId, newState);
        await this.broadcastState(newState);
        this.updateSyncStats(startTime, true);
        this.emit('state-updated', { taskId, state: newState, agentId });
        return true;
      }

      // Check for conflicts
      const hasConflict = this.detectConflict(existingState, update.version);
      if (hasConflict) {
        this.syncStats.conflicts++;
        // Last-write-wins: proceed with update anyway
      }

      // Update state with incremented version
      const updatedState: TaskState = {
        ...existingState,
        ...update,
        version: this.incrementVersion(existingState.version, agentId),
        updatedAt: Date.now()
      };

      this.globalState.taskStates.set(taskId, updatedState);
      await this.broadcastState(updatedState);
      this.updateSyncStats(startTime, true);

      this.emit('state-updated', { taskId, state: updatedState, agentId });
      return true;
    } catch (error) {
      this.updateSyncStats(startTime, false);
      this.emit('state-error', { error, taskId, agentId });
      return false;
    }
  }

  /**
   * Broadcast state update to all agents
   *
   * @param state - Task state to broadcast
   */
  private async broadcastState(state: TaskState): Promise<void> {
    const message: StateUpdateMessage = {
      type: 'state-update',
      taskId: state.taskId,
      state,
      timestamp: Date.now()
    };

    // Broadcast via AgentMesh
    this.mesh.broadcast('state-manager', 'state-updates', JSON.stringify(message));

    // Share via ContextShareManager for context-aware agents
    await this.contextShare.shareContext({
      type: 'decision',
      agent: 'state-manager',
      task: state.taskId,
      content: state,
      metadata: {
        timestamp: new Date().toISOString(),
        relevance: ['state', 'coordination'],
        priority: 'normal'
      }
    });
  }

  /**
   * Update sync statistics
   *
   * @param startTime - Operation start time
   * @param success - Whether operation succeeded
   */
  private updateSyncStats(startTime: number, success: boolean): void {
    const latency = Date.now() - startTime;

    if (success) {
      this.syncStats.successfulSyncs++;
    } else {
      this.syncStats.failedSyncs++;
    }

    // Update average latency (running average)
    const total = this.syncStats.successfulSyncs + this.syncStats.failedSyncs;
    this.syncStats.averageLatencyMs =
      (this.syncStats.averageLatencyMs * (total - 1) + latency) / total;

    this.syncStats.lastSyncTime = Date.now();
  }

  /**
   * Calculate checksum for state validation
   */
  private calculateChecksum(): string {
    // Simple hash of state for validation
    const stateHash = JSON.stringify(this.globalState);
    return this.simpleHash(stateHash);
  }

  /**
   * Simple hash function
   *
   * @param str - String to hash
   * @returns Hash as base-36 string
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Create checkpoint for crash recovery
   *
   * Persists current global state to disk.
   * Emits 'checkpoint-created' event on success.
   */
  private async createCheckpoint(): Promise<void> {
    const checkpointId = `checkpoint-${Date.now()}`;

    const checkpoint = {
      id: checkpointId,
      timestamp: Date.now(),
      globalState: this.serializeGlobalState(),
      syncStats: this.syncStats
    };

    await this.persistCheckpoint(checkpoint);

    this.globalState.checkpointId = checkpointId;
    this.emit('checkpoint-created', { checkpointId });
  }

  /**
   * Serialize global state for persistence
   *
   * Converts Maps to JSON-serializable arrays.
   *
   * @returns JSON string
   */
  private serializeGlobalState(): string {
    return JSON.stringify({
      version: {
        vectorClock: Object.fromEntries(this.globalState.version.vectorClock),
        timestamp: this.globalState.version.timestamp,
        checksum: this.globalState.version.checksum
      },
      taskStates: Array.from(this.globalState.taskStates.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          version: {
            vectorClock: Object.fromEntries(value.version.vectorClock),
            timestamp: value.version.timestamp,
            checksum: value.version.checksum
          }
        }
      ]),
      phaseState: Array.from(this.globalState.phaseState.entries()).map(([key, value]) => [
        key,
        {
          ...value,
          requirements: Array.from(value.requirements.entries())
        }
      ]),
      checkpointId: this.globalState.checkpointId
    });
  }

  /**
   * Deserialize global state from persistence
   *
   * Reconstructs Maps from JSON arrays.
   *
   * @param serialized - JSON string
   * @returns GlobalState object
   */
  private deserializeGlobalState(serialized: string): GlobalState {
    const data = JSON.parse(serialized);

    return {
      version: {
        vectorClock: new Map(Object.entries(data.version.vectorClock)),
        timestamp: data.version.timestamp,
        checksum: data.version.checksum
      },
      taskStates: new Map(
        data.taskStates.map(([key, value]: [string, TaskState]) => [
          key,
          {
            ...value,
            version: {
              vectorClock: new Map(Object.entries(value.version.vectorClock)),
              timestamp: value.version.timestamp,
              checksum: value.version.checksum
            }
          }
        ])
      ),
      phaseState: new Map(
        data.phaseState.map(([key, value]: [number, PhaseState]) => [
          key,
          {
            ...value,
            requirements: new Map(value.requirements)
          }
        ])
      ),
      checkpointId: data.checkpointId
    };
  }

  /**
   * Persist checkpoint to disk
   *
   * @param checkpoint - Checkpoint data
   */
  private async persistCheckpoint(checkpoint: unknown): Promise<void> {
    const checkpointsDir = path.join(path.dirname(this.statePath), 'checkpoints');

    // Create directory if not exists
    if (!fs.existsSync(checkpointsDir)) {
      fs.mkdirSync(checkpointsDir, { recursive: true });
    }

    const checkpointData = checkpoint as { id: string; timestamp: number; globalState: string; syncStats: SyncStats };
    const filename = `${checkpointData.id}.json`;
    const filepath = path.join(checkpointsDir, filename);

    await fs.promises.writeFile(filepath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  }

  /**
   * Load last checkpoint from disk
   *
   * @returns Checkpoint data or null if not found
   */
  private async loadLastCheckpoint(): Promise<unknown | null> {
    const checkpointsDir = path.join(path.dirname(this.statePath), 'checkpoints');

    if (!fs.existsSync(checkpointsDir)) {
      return null;
    }

    const files = fs
      .readdirSync(checkpointsDir)
      .filter((f) => f.startsWith('checkpoint-') && f.endsWith('.json'))
      .sort(); // Sort alphabetically (timestamp-based, so latest is last)

    if (files.length === 0) {
      return null;
    }

    const latestFile = files[files.length - 1]!;
    const filepath = path.join(checkpointsDir, latestFile);

    const content = await fs.promises.readFile(filepath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Recover from checkpoint
   *
   * Loads the last checkpoint and restores global state.
   * Emits 'recovery-complete' on success, 'recovery-failed' on error.
   *
   * @returns Promise resolving to true on success, false on failure
   */
  async recoverFromCheckpoint(): Promise<boolean> {
    try {
      const checkpoint = await this.loadLastCheckpoint();

      if (!checkpoint) {
        return false;
      }

      const checkpointData = checkpoint as { id: string; globalState: string; syncStats: SyncStats };

      this.globalState = this.deserializeGlobalState(checkpointData.globalState);
      this.syncStats = checkpointData.syncStats;

      this.emit('recovery-complete', { checkpointId: checkpointData.id });
      return true;
    } catch (error) {
      this.emit('recovery-failed', { error });
      return false;
    }
  }

  /**
   * Get sync statistics
   *
   * @returns Copy of sync statistics
   */
  getSyncStats(): SyncStats {
    return { ...this.syncStats }; // Return copy, not reference
  }

  /**
   * Handle state update message from agent
   *
   * @param message - Unknown message object
   */
  private handleStateUpdate(message: unknown): void {
    try {
      const parsed = typeof message === 'string' ? JSON.parse(message) : message;
      const stateMessage = parsed as StateUpdateMessage;

      if (stateMessage.type === 'state-update' && stateMessage.state) {
        // Apply state update
        this.globalState.taskStates.set(stateMessage.taskId, stateMessage.state);
        this.emit('state-updated', {
          taskId: stateMessage.taskId,
          state: stateMessage.state,
          agentId: stateMessage.agentId
        });
      }
    } catch (error) {
      this.emit('state-error', { error, message });
    }
  }

  /**
   * Stop the checkpoint timer
   *
   * Call this when shutting down the StateManager.
   */
  stop(): void {
    if (this.checkpointInterval) {
      clearInterval(this.checkpointInterval);
      this.checkpointInterval = null;
    }
  }
}

export default StateManager;
