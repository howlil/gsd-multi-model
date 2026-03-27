/**
 * State Conflict Resolution Type Definitions
 *
 * Provides type definitions for state conflict resolution:
 * - Resolution strategies (4 types)
 * - Conflict priorities (3 levels)
 * - Conflict status states
 * - Conflict records and negotiation messages
 *
 * @packageDocumentation
 */

/**
 * Conflict resolution strategy
 *
 * Determines how state conflicts are resolved:
 * - LAST_WRITE_WINS: Use the state with the latest timestamp (vector clock)
 * - MERGE: Combine non-conflicting field updates from both states
 * - PRIORITY_BASED: Resolve based on conflict priority level
 * - OPERATIONAL_TRANSFORM: Transform concurrent operations to preserve intent
 */
export enum ResolutionStrategy {
  LAST_WRITE_WINS = 'last-write-wins',
  MERGE = 'merge',
  PRIORITY_BASED = 'priority-based',
  OPERATIONAL_TRANSFORM = 'operational-transform'
}

/**
 * State conflict priority levels
 *
 * Priority determines resolution order and strategy selection:
 * - CRITICAL: System state, health status (highest priority)
 * - HIGH: Task state, execution status
 * - NORMAL: Metadata, analytics (lowest priority)
 */
export enum ConflictPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  NORMAL = 'normal'
}

/**
 * State conflict status
 *
 * Tracks the lifecycle of a conflict:
 * - PENDING: Conflict detected, not yet processed
 * - NEGOTIATING: Agent negotiation in progress
 * - RESOLVED: Conflict successfully resolved
 * - ESCALATED: Escalated to higher tier (orchestrator/user/manual)
 * - FAILED: Resolution failed validation
 */
export enum ConflictStatus {
  PENDING = 'pending',
  NEGOTIATING = 'negotiating',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  FAILED = 'failed'
}

/**
 * State conflict record
 *
 * Represents a detected state conflict with full audit information
 */
export interface StateConflict {
  /** Unique conflict identifier */
  id: string;
  /** Task ID associated with the conflict (if applicable) */
  taskId?: string;
  /** Phase number (if applicable) */
  phase?: number;
  /** Agent IDs involved in the conflict */
  agents: string[];
  /** Timestamp when conflict was detected (Unix ms) */
  detectedAt: number;
  /** Timestamp when conflict was resolved (Unix ms) */
  resolvedAt?: number;
  /** Resolution strategy used */
  strategy: ResolutionStrategy;
  /** Priority level of the conflict */
  priority: ConflictPriority;
  /** Current status of the conflict */
  status: ConflictStatus;
  /** State before the conflict */
  stateBefore: Record<string, unknown>;
  /** State after resolution (if resolved) */
  stateAfter?: Record<string, unknown>;
  /** Notes about the resolution */
  resolutionNotes?: string;
  /** Escalation level (0=negotiation, 1=orchestrator, 2=user, 3=manual) */
  escalationLevel?: number;
}

/**
 * Negotiation proposal from an agent
 *
 * Sent by agents during Tier 1 negotiation
 */
export interface NegotiationProposal {
  /** Agent ID proposing the resolution */
  agentId: string;
  /** Proposed resolution strategy */
  proposedResolution: ResolutionStrategy;
  /** Rationale for the proposed strategy */
  rationale: string;
  /** Timestamp of the proposal (Unix ms) */
  timestamp: number;
}

/**
 * Negotiation result
 *
 * Result of agent negotiation protocol
 */
export interface NegotiationResult {
  /** Whether agents reached agreement */
  agreed: boolean;
  /** Agreed-upon strategy (if agreed is true) */
  strategy?: ResolutionStrategy;
  /** All proposals collected from agents */
  proposals: NegotiationProposal[];
}

/**
 * Resolution statistics
 *
 * Aggregated metrics for conflict resolution
 */
export interface ResolutionStats {
  /** Total number of conflicts */
  totalConflicts: number;
  /** Rate of auto-resolution (0.0 to 1.0) */
  autoResolutionRate: number;
  /** Distribution of strategies used */
  strategyDistribution: Record<string, number>;
  /** Average resolution time in milliseconds */
  averageResolutionTimeMs: number;
  /** Rate of escalation (0.0 to 1.0) */
  escalationRate: number;
  /** Top 5 most problematic states */
  topProblematicStates: Array<{ state: string; conflicts: number }>;
}

/**
 * Operational transform operation
 *
 * Used for concurrent edit resolution
 */
export interface Operation {
  /** Operation type */
  type: 'append' | 'increment' | 'decrement';
  /** Field to operate on */
  field: string;
  /** Value for the operation */
  value: unknown;
}
