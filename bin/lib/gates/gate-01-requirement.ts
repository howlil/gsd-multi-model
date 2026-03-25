/**
 * Gate 1: Requirement Completeness
 *
 * Validates that all requirements are properly mapped to tasks/phases
 * and have clear acceptance criteria in Given-When-Then format.
 *
 * Checks:
 * 1. All REQ-IDs are mapped to tasks or phases
 * 2. Acceptance criteria exist and follow Given-When-Then format
 * 3. Returns structured errors for unmapped or incomplete requirements
 *
 * @module gates/gate-01-requirement
 */

import { z } from 'zod';

/**
 * Zod schema for a single requirement
 */
export const requirementSchema = z.object({
  /** Unique requirement identifier (e.g., 'REQ-001', 'GRAPH-01') */
  id: z.string().min(1, 'Requirement ID is required'),
  /** Human-readable requirement description */
  description: z.string().min(1, 'Requirement description is required'),
  /** Acceptance criteria array (each should follow Given-When-Then format) */
  acceptanceCriteria: z.array(z.string()).min(1, 'At least one acceptance criterion is required'),
  /** Optional: Array of task IDs that implement this requirement */
  mappedTasks: z.array(z.string()).optional(),
  /** Optional: Array of phase IDs that cover this requirement */
  mappedPhases: z.array(z.string()).optional(),
});

/**
 * Zod schema for a single task
 */
export const taskSchema = z.object({
  /** Unique task identifier */
  id: z.string(),
  /** Task name/title */
  name: z.string(),
  /** Optional: Requirements this task addresses */
  requirements: z.array(z.string()).optional(),
});

/**
 * Zod schema for a single phase
 */
export const phaseSchema = z.object({
  /** Unique phase identifier */
  id: z.string(),
  /** Phase name/title */
  name: z.string(),
  /** Optional: Requirements this phase covers */
  requirements: z.array(z.string()).optional(),
});

/**
 * Zod schema for the gate context
 */
export const gateContextSchema = z.object({
  /** Array of all requirements to validate */
  requirements: z.array(requirementSchema),
  /** Optional: Array of tasks for mapping validation */
  tasks: z.array(taskSchema).optional(),
  /** Optional: Array of phases for mapping validation */
  phases: z.array(phaseSchema).optional(),
});

/**
 * Given-When-Then format check result
 */
export interface GivenWhenThenResult {
  /** Whether format is valid */
  valid: boolean;
  /** Missing BDD components */
  missingComponents: string[];
  /** Format suggestion */
  suggestion: string;
}

/**
 * Gate error structure
 */
export interface GateError {
  /** Error path */
  path: string;
  /** Error message */
  message: string;
}

/**
 * Gate result structure
 */
export interface GateResult {
  /** Whether gate passed */
  passed: boolean;
  /** Array of errors */
  errors: GateError[];
  /** Array of warnings */
  warnings: string[];
}

/**
 * Check if acceptance criteria follow Given-When-Then format
 *
 * Accepts variations:
 * - "Given X, When Y, Then Z" (single line)
 * - "Given X\nWhen Y\nThen Z" (multi-line)
 * - "Given: X\nWhen: Y\nThen: Z" (with colons)
 * - Separate "Given...", "When...", "Then..." entries
 *
 * @param acceptanceCriteria - Array of acceptance criteria strings
 * @returns Format check result
 */
export function checkGivenWhenThenFormat(acceptanceCriteria: string[]): GivenWhenThenResult {
  const result: GivenWhenThenResult = {
    valid: true,
    missingComponents: [],
    suggestion: '',
  };

  if (!acceptanceCriteria || acceptanceCriteria.length === 0) {
    result.valid = false;
    result.missingComponents = ['Given', 'When', 'Then'];
    result.suggestion = 'Add acceptance criteria in Given-When-Then format';
    return result;
  }

  // Combine all criteria into single text for analysis
  const fullText = acceptanceCriteria.join('\n').toLowerCase();

  // Check for Given-When-Then components
  const hasGiven = /given[:\s]/.test(fullText);
  const hasWhen = /when[:\s]/.test(fullText);
  const hasThen = /then[:\s]/.test(fullText);

  if (!hasGiven) {
    result.missingComponents.push('Given');
  }
  if (!hasWhen) {
    result.missingComponents.push('When');
  }
  if (!hasThen) {
    result.missingComponents.push('Then');
  }

  if (result.missingComponents.length > 0) {
    result.valid = false;
    result.suggestion = `Missing BDD components: ${result.missingComponents.join(', ')}. ` +
      'Format: "Given [context], When [action], Then [expected outcome]"';
  }

  return result;
}

/**
 * Extract REQ-IDs from a text string
 * Matches patterns like: REQ-001, GRAPH-02, GATE-01, etc.
 *
 * @param text - Text to search for requirement IDs
 * @returns Array of found requirement IDs
 */
export function extractRequirementIds(text: string): string[] {
  if (!text) return [];

  // Match patterns like REQ-001, GRAPH-02, GATE-01, etc.
  const pattern = /\b([A-Z]+-\d+)\b/g;
  const matches = text.match(pattern);
  return matches ? Array.from(new Set(matches)) : [];
}

/**
 * Build a map of requirement IDs to their mappings from tasks
 *
 * @param tasks - Array of task objects
 * @returns Map of reqId -> Set of task IDs
 */
export function buildRequirementTaskMap(tasks: Array<{ id?: string; requirements?: string[]; name?: string; description?: string }>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  if (!tasks || !Array.isArray(tasks)) {
    return map;
  }

  for (const task of tasks) {
    if (!task.id) continue;
    const reqs = task.requirements || [];
    for (const reqId of reqs) {
      if (!map.has(reqId)) {
        map.set(reqId, new Set());
      }
      map.get(reqId)!.add(task.id);
    }

    // Also check task name and description for implicit references
    const implicitRefs = extractRequirementIds(`${task.name ?? ''} ${task.description ?? ''}`);
    for (const reqId of implicitRefs) {
      if (!map.has(reqId)) {
        map.set(reqId, new Set());
      }
      map.get(reqId)!.add(task.id);
    }
  }

  return map;
}

/**
 * Build a map of requirement IDs to their mappings from phases
 *
 * @param phases - Array of phase objects
 * @returns Map of reqId -> Set of phase IDs
 */
export function buildRequirementPhaseMap(phases: Array<{ id?: string; requirements?: string[]; name?: string; description?: string }>): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  if (!phases || !Array.isArray(phases)) {
    return map;
  }

  for (const phase of phases) {
    if (!phase.id) continue;
    const reqs = phase.requirements || [];
    for (const reqId of reqs) {
      if (!map.has(reqId)) {
        map.set(reqId, new Set());
      }
      map.get(reqId)!.add(phase.id);
    }

    // Also check phase name and description for implicit references
    const implicitRefs = extractRequirementIds(`${phase.name ?? ''} ${phase.description ?? ''}`);
    for (const reqId of implicitRefs) {
      if (!map.has(reqId)) {
        map.set(reqId, new Set());
      }
      map.get(reqId)!.add(phase.id);
    }
  }

  return map;
}

/**
 * Gate 1 Executor: Requirement Completeness Check
 *
 * Validates:
 * 1. All requirements have mapped tasks or phases
 * 2. All requirements have acceptance criteria in Given-When-Then format
 *
 * @param context - Gate context (validated against gateContextSchema)
 * @returns Gate result
 */
export async function executeGate1(context: z.infer<typeof gateContextSchema>): Promise<GateResult> {
  const errors: GateError[] = [];
  const warnings: string[] = [];

  // Build mapping indices
  const taskMap = buildRequirementTaskMap(context.tasks ?? []);
  const phaseMap = buildRequirementPhaseMap(context.phases ?? []);

  // Check each requirement
  for (let i = 0; i < context.requirements.length; i++) {
    const req = context.requirements[i];
    const reqPath = `requirements[${i}]`;

    // Check 1: Requirement mapping
    const mappedToTasks = taskMap.has(req.id);
    const mappedToPhases = phaseMap.has(req.id);
    const hasExplicitMapping = (req.mappedTasks && req.mappedTasks.length > 0) ||
                               (req.mappedPhases && req.mappedPhases.length > 0);

    if (!mappedToTasks && !mappedToPhases && !hasExplicitMapping) {
      errors.push({
        path: `${reqPath}.id`,
        message: `Requirement '${req.id}' is not mapped to any task or phase. ` +
          `Add 'requirements: ["${req.id}"]' to a task/phase frontmatter or ` +
          `add explicit mappedTasks/mappedPhases array.`,
      });
    }

    // Check 2: Acceptance criteria format
    const formatCheck = checkGivenWhenThenFormat(req.acceptanceCriteria);
    if (!formatCheck.valid) {
      errors.push({
        path: `${reqPath}.acceptanceCriteria`,
        message: `Requirement '${req.id}' has acceptance criteria that don't follow ` +
          `Given-When-Then format. ${formatCheck.suggestion}`,
      });
    }

    // Check 3: Acceptance criteria specificity (warning)
    for (let j = 0; j < req.acceptanceCriteria.length; j++) {
      const criterion = req.acceptanceCriteria[j];
      if (criterion.length < 20) {
        warnings.push(
          `${reqPath}.acceptanceCriteria[${j}]: Criterion for '${req.id}' is very short ` +
          `(${criterion.length} chars). Consider adding more specific, testable criteria.`
        );
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create and register Gate 1 with a QualityGate instance
 *
 * @param gateCoordinator - QualityGate coordinator instance
 */
export function registerGate1(gateCoordinator: { registerGate: (name: string, schema: z.ZodSchema, executor: (ctx: unknown) => Promise<GateResult>) => void }): void {
  gateCoordinator.registerGate('gate-01-requirement', gateContextSchema, executeGate1);
}
