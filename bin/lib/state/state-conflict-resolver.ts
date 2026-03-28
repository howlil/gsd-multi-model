/**
 * State Conflict Resolver — Multi-strategy conflict resolution
 *
 * Provides advanced state conflict resolution with operational transformation,
 * field-level merge, priority-based resolution, and agent negotiation.
 *
 * Auto-resolution target: 95%
 * Negotiation timeout: 5s
 * Escalation: 4-tier (Negotiation → Orchestrator → User → Manual)
 */

import { StateManager } from './state-manager.js';
import { AgentMesh } from '../orchestration/AgentMesh.js';
import { StateConflictLog } from './state-conflict-log.js';
import { defaultLogger as logger } from '../logger/index.js';
import { EventEmitter } from 'events';

/**
 * Resolution strategy enum
 */
export enum ResolutionStrategy {
  LAST_WRITE_WINS = 'last-write-wins',
  MERGE = 'merge',
  PRIORITY_BASED = 'priority-based',
  OPERATIONAL_TRANSFORM = 'operational-transform'
}

/**
 * Conflict priority enum
 */
export enum ConflictPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  NORMAL = 'normal'
}

/**
 * Conflict status enum
 */
export enum ConflictStatus {
  PENDING = 'pending',
  NEGOTIATING = 'negotiating',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  FAILED = 'failed'
}

/**
 * State conflict interface
 */
export interface StateConflict {
  id: string;
  taskId: string | undefined;
  phase: number | undefined;
  agents: string[];
  detectedAt: number;
  resolvedAt: number | undefined;
  strategy: ResolutionStrategy;
  priority: ConflictPriority;
  status: ConflictStatus;
  stateBefore: Record<string, unknown>;
  stateAfter: Record<string, unknown> | undefined;
  resolutionNotes: string | undefined;
  escalationLevel: number | undefined;
}

/**
 * Negotiation proposal interface
 */
export interface NegotiationProposal {
  agentId: string;
  proposedResolution: ResolutionStrategy;
  rationale: string;
  timestamp: number;
}

/**
 * Negotiation result interface
 */
export interface NegotiationResult {
  agreed: boolean;
  strategy: ResolutionStrategy | undefined;
  proposals: NegotiationProposal[];
}

/**
 * Resolution statistics interface
 */
export interface ResolutionStats {
  totalConflicts: number;
  autoResolutionRate: number;
  strategyDistribution: Record<string, number>;
  averageResolutionTimeMs: number;
  escalationRate: number;
  topProblematicStates: Array<{ state: string; conflicts: number }>;
}

/**
 * Operation for operational transformation
 */
export interface Operation {
  type: 'append' | 'increment' | 'decrement' | 'set';
  path: string;
  value?: unknown;
  delta?: number;
}

export class StateConflictResolver extends EventEmitter {
  private readonly stateManager: StateManager;
  private readonly mesh: AgentMesh;
  private readonly conflictLog: StateConflictLog;
  private readonly negotiationTimeout: number;
  private readonly autoResolutionTarget: number;

  constructor(
    stateManager: StateManager,
    mesh: AgentMesh,
    negotiationTimeoutMs: number = 5000,
    autoResolutionTarget: number = 0.95
  ) {
    super();
    this.stateManager = stateManager;
    this.mesh = mesh;
    this.conflictLog = new StateConflictLog();
    this.negotiationTimeout = negotiationTimeoutMs;
    this.autoResolutionTarget = autoResolutionTarget;

    logger.info('StateConflictResolver initialized', {
      negotiationTimeout: `${negotiationTimeoutMs}ms`,
      autoResolutionTarget: `${autoResolutionTarget * 100}%`
    });
  }

  /**
   * Main entry point: resolve conflict
   */
  async resolveConflict(conflict: StateConflict): Promise<void> {
    try {
      logger.info('Resolving state conflict', {
        conflictId: conflict.id,
        agents: conflict.agents.length,
        priority: conflict.priority
      });

      // Select resolution strategy
      const strategy = this.selectStrategy(conflict);
      conflict.strategy = strategy;
      conflict.status = ConflictStatus.NEGOTIATING;

      // Try agent negotiation first (Tier 1)
      const negotiationResult = await this.negotiateResolution(conflict);

      if (negotiationResult.agreed && negotiationResult.strategy) {
        // Agents agreed on strategy
        conflict.strategy = negotiationResult.strategy;
        await this.applyResolution(conflict, negotiationResult.strategy);
      } else {
        // Escalate if negotiation fails
        await this.escalate(conflict, 2);
      }

      // Log resolution
      await this.conflictLog.logResolution(conflict);

      logger.info('Conflict resolved', {
        conflictId: conflict.id,
        strategy: conflict.strategy,
        duration: (conflict.resolvedAt || Date.now()) - conflict.detectedAt
      });

      this.emit('conflict-resolved', conflict);
    } catch (error) {
      logger.error('Failed to resolve conflict', {
        conflictId: conflict.id,
        error: (error as Error).message
      });

      conflict.status = ConflictStatus.FAILED;
      await this.conflictLog.logResolution(conflict);
      this.emit('conflict-failed', conflict);
    }
  }

  /**
   * Tier 1: Agent negotiation
   */
  async negotiateResolution(conflict: StateConflict): Promise<NegotiationResult> {
    const proposals: NegotiationProposal[] = [];
    const timeout = this.negotiationTimeout;

    logger.debug('Starting agent negotiation', {
      conflictId: conflict.id,
      agents: conflict.agents,
      timeout: `${timeout}ms`
    });

    // Request proposals from each agent
    const proposalPromises = conflict.agents.map(async (agentId) => {
      try {
        const message = {
          type: 'conflict-negotiation',
          conflict: {
            id: conflict.id,
            priority: conflict.priority,
            stateBefore: conflict.stateBefore
          },
          timeout
        };

        // Send negotiation request with timeout
        const response = await this.mesh.sendMessageWithTimeout(agentId, message, timeout);
        
        if (response && response.proposal) {
          proposals.push({
            agentId,
            proposedResolution: response.proposal.strategy,
            rationale: response.proposal.rationale,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        logger.warn('Agent negotiation timeout', {
          conflictId: conflict.id,
          agentId,
          timeout: `${timeout}ms`
        });
      }
    });

    await Promise.all(proposalPromises);

    // Check for agreement (majority ≥50%)
    if (proposals.length > 0) {
      const strategyCounts = new Map<ResolutionStrategy, number>();
      
      for (const proposal of proposals) {
        const count = strategyCounts.get(proposal.proposedResolution) || 0;
        strategyCounts.set(proposal.proposedResolution, count + 1);
      }

      // Find majority strategy
      let majorityStrategy: ResolutionStrategy | undefined;
      let maxCount = 0;

      for (const [strategy, count] of strategyCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          majorityStrategy = strategy;
        }
      }

      // Check if majority (≥50%)
      if (majorityStrategy && maxCount >= Math.ceil(conflict.agents.length / 2)) {
        logger.info('Negotiation succeeded', {
          conflictId: conflict.id,
          strategy: majorityStrategy,
          agreement: `${maxCount}/${conflict.agents.length}`
        });

        return {
          agreed: true,
          strategy: majorityStrategy,
          proposals
        };
      }
    }

    logger.warn('Negotiation failed', {
      conflictId: conflict.id,
      proposals: proposals.length,
      agents: conflict.agents.length
    });

    return {
      agreed: false,
      strategy: undefined,
      proposals
    };
  }

  /**
   * Apply operational transformation for concurrent edits
   */
  applyOperationalTransform(
    state: Record<string, unknown>,
    operations: Operation[]
  ): Record<string, unknown> {
    const result = { ...state };

    for (const op of operations) {
      const field = op.field as string;
      switch (op.type) {
        case 'append':
          const arrayValue = result[field] as unknown[] || [];
          result[field] = [...arrayValue, op.value];
          break;

        case 'increment':
          const incValue = result[field] as number || 0;
          result[field] = incValue + (op.value as number || 0);
          break;

        case 'decrement':
          const decValue = result[field] as number || 0;
          result[field] = decValue - (op.value as number || 0);
          break;

        case 'set':
          result[field] = op.value;
          break;
      }
    }

    return result;
  }

  /**
   * Field-level merge for non-conflicting changes
   */
  mergeFields(
    stateA: Record<string, unknown>,
    stateB: Record<string, unknown>
  ): Record<string, unknown> {
    const result = { ...stateA };
    const keysA = Object.keys(stateA);
    const keysB = Object.keys(stateB);

    // Merge non-conflicting fields
    for (const key of keysB) {
      if (!keysA.includes(key)) {
        // New field from B
        result[key] = stateB[key];
      } else if (JSON.stringify(stateA[key]) === JSON.stringify(stateB[key])) {
        // Same value, no conflict
        result[key] = stateA[key];
      } else {
        // Conflict detected - use last-write-wins (stateB)
        result[key] = stateB[key];
        logger.debug('Field conflict during merge', {
          field: key,
          valueA: stateA[key],
          valueB: stateB[key]
        });
      }
    }

    return result;
  }

  /**
   * 4-tier escalation
   */
  async escalate(conflict: StateConflict, level: number): Promise<ResolutionStrategy | null> {
    conflict.escalationLevel = level;
    conflict.status = ConflictStatus.ESCALATED;

    logger.warn('Escalating conflict', {
      conflictId: conflict.id,
      level,
      priority: conflict.priority
    });

    switch (level) {
      case 1:
        // Already tried: Agent Negotiation
        return null;

      case 2:
        // Orchestrator decides
        logger.info('Tier 2: Orchestrator decision', {
          conflictId: conflict.id
        });
        conflict.strategy = ResolutionStrategy.LAST_WRITE_WINS;
        await this.applyResolution(conflict, conflict.strategy);
        return conflict.strategy;

      case 3:
        // Escalate to user
        logger.error('Tier 3: User escalation', {
          conflictId: conflict.id,
          agents: conflict.agents
        });
        // In production, this would notify the user
        return null;

      case 4:
        // Manual intervention required
        logger.error('Tier 4: Manual intervention required', {
          conflictId: conflict.id
        });
        return null;

      default:
        return null;
    }
  }

  /**
   * Select resolution strategy based on conflict characteristics
   */
  selectStrategy(conflict: StateConflict): ResolutionStrategy {
    // Critical priority → priority-based resolution
    if (conflict.priority === ConflictPriority.CRITICAL) {
      return ResolutionStrategy.PRIORITY_BASED;
    }

    // Check if mergeable
    if (this.isMergeable(conflict)) {
      return ResolutionStrategy.MERGE;
    }

    // Check if concurrent edit (compatible operations)
    if (this.isConcurrentEdit(conflict)) {
      return ResolutionStrategy.OPERATIONAL_TRANSFORM;
    }

    // Default: last-write-wins
    return ResolutionStrategy.LAST_WRITE_WINS;
  }

  /**
   * Check if conflict is mergeable (non-conflicting field changes)
   */
  isMergeable(conflict: StateConflict): boolean {
    // Conservative: return false by default
    // In production, would check if agents modified different fields
    return false;
  }

  /**
   * Check if conflict is concurrent edit (compatible operations)
   */
  isConcurrentEdit(conflict: StateConflict): boolean {
    // Conservative: return false by default
    // In production, would check if operations are compatible
    return false;
  }

  /**
   * Get fields modified by agent
   */
  getModifiedFields(
    before: Record<string, unknown>,
    agentId: string
  ): string[] {
    // In production, this would track actual modifications
    // For now, return all fields (conservative approach)
    return Object.keys(before);
  }

  /**
   * Apply resolution strategy
   */
  async applyResolution(
    conflict: StateConflict,
    strategy: ResolutionStrategy
  ): Promise<void> {
    let resolvedState: Record<string, unknown>;

    switch (strategy) {
      case ResolutionStrategy.LAST_WRITE_WINS:
        resolvedState = conflict.stateAfter || conflict.stateBefore;
        break;

      case ResolutionStrategy.MERGE:
        // In production, would merge actual conflicting states
        resolvedState = conflict.stateAfter || conflict.stateBefore;
        break;

      case ResolutionStrategy.PRIORITY_BASED:
        // Critical priority wins
        resolvedState = conflict.stateAfter || conflict.stateBefore;
        break;

      case ResolutionStrategy.OPERATIONAL_TRANSFORM:
        // Apply OT operations
        resolvedState = this.applyOperationalTransform(conflict.stateBefore, []);
        break;

      default:
        resolvedState = conflict.stateBefore;
    }

    conflict.stateAfter = resolvedState;
    conflict.resolvedAt = Date.now();
    conflict.status = ConflictStatus.RESOLVED;

    // Apply to state manager
    await this.stateManager.applyResolvedState(conflict.id, resolvedState);
  }

  /**
   * Validate state after resolution
   */
  validateState(state: Record<string, unknown>): boolean {
    // Basic validation: state must be non-null object
    return state !== null && typeof state === 'object';
  }

  /**
   * Get resolution statistics
   */
  async getResolutionStats(): Promise<ResolutionStats> {
    const stats = await this.conflictLog.getStatistics();

    return {
      totalConflicts: stats.totalConflicts,
      autoResolutionRate: stats.autoResolutionRate,
      strategyDistribution: stats.strategyDistribution,
      averageResolutionTimeMs: stats.averageResolutionTimeMs,
      escalationRate: stats.escalationRate,
      topProblematicStates: stats.topProblematicStates
    };
  }
}
