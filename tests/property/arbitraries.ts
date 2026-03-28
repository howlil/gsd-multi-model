/**
 * Property-Based Testing Arbitraries (TEST-16)
 *
 * Fast-check arbitraries for ez-agents domain types.
 * Provides reusable generators for property-based tests.
 */

import fc from 'fast-check';

// ─── Agent Mesh Arbitraries ──────────────────────────────────────────────────

/**
 * Arbitrary for agent IDs
 */
export const agentIdArb = fc.string().filter(s => s.length > 0 && s.length < 50);

/**
 * Arbitrary for task IDs
 */
export const taskIdArb = fc.string().filter(s => s.length > 0 && s.length < 50);

/**
 * Arbitrary for task status
 */
export const taskStatusArb = fc.oneof(
  fc.constant('pending' as const),
  fc.constant('claimed' as const),
  fc.constant('completed' as const),
  fc.constant('failed' as const)
);

/**
 * Arbitrary for capabilities
 */
export const capabilityArb = fc.string().filter(s => s.length > 0 && s.length < 30);

/**
 * Arbitrary for task descriptions
 */
export const taskDescriptionArb = fc.string().filter(s => s.length > 0 && s.length < 200);

/**
 * Arbitrary for message content
 */
export const messageContentArb = fc.string().filter(s => s.length > 0 && s.length < 500);

/**
 * Arbitrary for channel names
 */
export const channelArb = fc.string().filter(s => s.length > 0 && s.length < 50);

// ─── State Manager Arbitraries ───────────────────────────────────────────────

/**
 * Arbitrary for phase numbers
 */
export const phaseArb = fc.nat({ max: 100 });

/**
 * Arbitrary for plan numbers
 */
export const planArb = fc.nat({ max: 20 });

/**
 * Arbitrary for task state status
 */
export const taskStateStatusArb = fc.oneof(
  fc.constant('pending' as const),
  fc.constant('in-progress' as const),
  fc.constant('completed' as const),
  fc.constant('failed' as const)
);

/**
 * Arbitrary for phase state status
 */
export const phaseStateStatusArb = fc.oneof(
  fc.constant('not-started' as const),
  fc.constant('in-progress' as const),
  fc.constant('completed' as const)
);

/**
 * Arbitrary for metadata records
 */
export const metadataArb = fc.record({
  priority: fc.oneof(fc.constant('low'), fc.constant('medium'), fc.constant('high')),
  tags: fc.array(fc.string()),
  customData: fc.anything()
}, { withDeletedKeys: true });

/**
 * Arbitrary for vector clocks
 */
export const vectorClockArb = fc.dictionary(
  agentIdArb,
  fc.nat({ max: 1000 }),
  { maxKeys: 10 }
);

// ─── Context Slicer Arbitraries ──────────────────────────────────────────────

/**
 * Arbitrary for file paths
 */
export const filePathArb = fc.string().filter(s => s.length > 0 && s.length < 200);

/**
 * Arbitrary for file patterns
 */
export const filePatternArb = fc.oneof(
  fc.constant('*.ts'),
  fc.constant('*.js'),
  fc.constant('*.md'),
  fc.constant('**/*.ts'),
  fc.constant('src/**/*.ts'),
  fc.string().filter(s => s.length > 0 && s.length < 50)
);

/**
 * Arbitrary for task descriptions (context slicing)
 */
export const contextTaskArb = fc.string().filter(s => s.length > 5 && s.length < 300);

/**
 * Arbitrary for file content
 */
export const fileContentArb = fc.string().filter(s => s.length > 0 && s.length < 5000);

/**
 * Arbitrary for context tiers
 */
export const contextTierArb = fc.oneof(
  fc.constant('hot' as const),
  fc.constant('warm' as const),
  fc.constant('cold' as const)
);

/**
 * Arbitrary for token budgets
 */
export const tokenBudgetArb = fc.nat({ min: 1000, max: 50000 });

// ─── File Lock Manager Arbitraries ───────────────────────────────────────────

/**
 * Arbitrary for lock timeouts
 */
export const lockTimeoutArb = fc.nat({ min: 1000, max: 60000 });

/**
 * Arbitrary for lock priorities
 */
export const lockPriorityArb = fc.nat({ max: 10 });

/**
 * Arbitrary for lock options
 */
export const lockOptionsArb = fc.record({
  timeout: fc.option(lockTimeoutArb),
  staleTime: fc.option(fc.nat({ min: 10000, max: 120000 })),
  heartbeatInterval: fc.option(fc.nat({ min: 1000, max: 30000 })),
  waitForLock: fc.option(fc.boolean()),
  priority: fc.option(lockPriorityArb)
}, { withDeletedKeys: true });

// ─── Quality Gate Arbitraries ────────────────────────────────────────────────

/**
 * Arbitrary for gate IDs
 */
export const gateIdArb = fc.oneof(
  fc.constant('gate-01-requirement'),
  fc.constant('gate-02-architecture'),
  fc.constant('gate-03-code'),
  fc.constant('gate-04-security')
);

/**
 * Arbitrary for requirement IDs
 */
export const requirementIdArb = fc.string().filter(s => /^[A-Z]+-\d+$/.test(s) && s.length < 20);

/**
 * Arbitrary for gate errors
 */
export const gateErrorArb = fc.record({
  message: fc.string().filter(s => s.length > 0 && s.length < 200),
  severity: fc.oneof(fc.constant('error'), fc.constant('warning'), fc.constant('info'))
});

/**
 * Arbitrary for gate context
 */
export const gateContextArb = fc.record({
  files: fc.array(fc.record({
    path: filePathArb,
    content: fileContentArb
  })),
  requirements: fc.array(fc.record({
    id: requirementIdArb,
    description: fc.string(),
    acceptanceCriteria: fc.array(fc.string())
  })),
  hasInputValidation: fc.boolean()
}, { withDeletedKeys: true });

// ─── Orchestrator Arbitraries ────────────────────────────────────────────────

/**
 * Arbitrary for work types
 */
export const workTypeArb = fc.oneof(
  fc.constant('coding'),
  fc.constant('testing'),
  fc.constant('review'),
  fc.constant('planning'),
  fc.constant('research')
);

/**
 * Arbitrary for agent results
 */
export const agentResultArb = fc.record({
  agentId: agentIdArb,
  output: fc.string(),
  success: fc.boolean(),
  duration: fc.nat({ max: 60000 })
});

/**
 * Arbitrary for subagent configurations
 */
export const subagentConfigArb = fc.record({
  maxConcurrent: fc.nat({ min: 1, max: 10 }),
  timeout: fc.nat({ min: 1000, max: 120000 }),
  retryCount: fc.nat({ max: 5 })
}, { withDeletedKeys: true });

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Generate a random timestamp within the last hour
 */
export function recentTimestampArb(): fc.Arbitrary<number> {
  const now = Date.now();
  return fc.nat({ min: now - 3600000, max: now });
}

/**
 * Generate a random non-empty array
 */
export function nonEmptyArrayArb<T>(arb: fc.Arbitrary<T>): fc.Arbitrary<T[]> {
  return fc.array(arb, { minLength: 1 });
}

/**
 * Generate unique strings from an arbitrary
 */
export function uniqueStringArb(): fc.Arbitrary<string> {
  return fc.uuid();
}
