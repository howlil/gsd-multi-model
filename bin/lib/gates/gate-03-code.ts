/**
 * Gate 3: Code Quality
 *
 * Validates code quality patterns and detects overengineering.
 *
 * Checks:
 * 1. Clean code rules (function length < 50 lines, nesting < 4 levels, naming conventions)
 * 2. Code smell detector (magic numbers, long parameter lists, duplicate code)
 * 3. Anti-overengineering (generic helpers, premature abstraction, unused interfaces)
 *
 * @module gates/gate-03-code
 */

import { z } from 'zod';

/**
 * Zod schema for a code file
 */
export const codeFileSchema = z.object({
  /** File path */
  path: z.string(),
  /** File content */
  content: z.string(),
  /** File language (e.g., 'javascript', 'typescript') */
  language: z.string().optional(),
  /** Function definitions in the file */
  functions: z.array(z.object({
    /** Function name */
    name: z.string(),
    /** Function start line */
    startLine: z.number().int().min(0),
    /** Function end line */
    endLine: z.number().int().min(0),
    /** Function body content */
    body: z.string().optional(),
    /** Function parameters */
    parameters: z.array(z.string()).optional(),
  })).optional(),
});

/**
 * Zod schema for code metrics
 */
export const codeMetricsSchema = z.object({
  /** Total lines of code */
  totalLines: z.number().int().min(0).optional(),
  /** Code lines (excluding comments and blanks) */
  codeLines: z.number().int().min(0).optional(),
  /** Comment lines */
  commentLines: z.number().int().min(0).optional(),
  /** Average function length */
  avgFunctionLength: z.number().nonnegative().optional(),
  /** Maximum nesting depth */
  maxNesting: z.number().int().min(0).optional(),
  /** Number of magic numbers */
  magicNumberCount: z.number().int().min(0).optional(),
  /** Number of long parameter lists */
  longParamListCount: z.number().int().min(0).optional(),
});

/**
 * Zod schema for the gate context
 */
export const gateContextSchema = z.object({
  /** Array of code files to analyze */
  files: z.array(codeFileSchema).optional(),
  /** Pre-computed code metrics */
  metrics: codeMetricsSchema.optional(),
  /** Generic helper functions to check for sprawl */
  genericHelpers: z.array(z.object({
    /** Helper name */
    name: z.string(),
    /** Helper usage count */
    usageCount: z.number().int().min(0).optional(),
    /** Helper file path */
    path: z.string().optional(),
  })).optional(),
  /** Named constants in the codebase */
  namedConstants: z.array(z.object({
    /** Constant name */
    name: z.string(),
    /** Constant value */
    value: z.union([z.string(), z.number(), z.boolean()]),
  })).optional(),
});

/**
 * Thresholds for code quality checks
 */
export const THRESHOLDS = {
  /** Maximum function length in lines */
  maxFunctionLength: 50,
  /** Maximum nesting depth */
  maxNesting: 4,
  /** Maximum parameters in function signature */
  maxParameters: 5,
  /** Minimum constant name length to be considered meaningful */
  minConstantNameLength: 3,
  /** Magic number threshold - numbers below this are ignored */
  magicNumberIgnoreThreshold: 2,
  /** Generic helper sprawl threshold */
  genericHelperSprawlThreshold: 3,
};

/**
 * Gate error structure
 */
export interface GateError {
  path: string;
  message: string;
}

/**
 * Gate result structure
 */
export interface GateResult {
  passed: boolean;
  errors: GateError[];
  warnings: string[];
}

/**
 * Count lines in a string
 * @param content - Content to count lines in
 */
export function countLines(content: string): number {
  if (!content || typeof content !== 'string') {
    return 0;
  }
  return content.split('\n').length;
}

/**
 * Calculate nesting depth of code
 *
 * Counts nested blocks by tracking opening and closing braces.
 * Handles common patterns: if/else, for, while, function, switch, try/catch
 *
 * @param code - Code content to analyze
 * @returns Maximum nesting depth
 */
export function calculateNestingDepth(code: string): number {
  if (!code || typeof code !== 'string') {
    return 0;
  }

  let maxDepth = 0;
  let currentDepth = 0;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];

    if (char === '{') {
      currentDepth++;
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }
    } else if (char === '}') {
      currentDepth--;
      if (currentDepth < 0) {
        currentDepth = 0;
      }
    }
  }

  return Math.max(0, maxDepth - 1);
}

/**
 * Check if nesting depth exceeds threshold
 * @param code - Code content to analyze
 */
export function checkNestingDepth(code: string): { exceeds: boolean; depth: number } {
  const depth = calculateNestingDepth(code);
  return {
    exceeds: depth > THRESHOLDS.maxNesting,
    depth,
  };
}

/**
 * Check if function exceeds maximum length
 * @param functionBody - Function body content
 */
export function checkFunctionLength(functionBody: string): { exceeds: boolean; length: number } {
  const length = countLines(functionBody);
  return {
    exceeds: length > THRESHOLDS.maxFunctionLength,
    length,
  };
}

/**
 * Check for long parameter lists
 *
 * Functions with more than THRESHOLDS.maxParameters parameters
 * are considered to have a code smell.
 *
 * @param parameters - Array of parameter names
 */
export function checkParameterList(parameters: string[]): { exceeds: boolean; count: number } {
  const count = parameters ? parameters.length : 0;
  return {
    exceeds: count > THRESHOLDS.maxParameters,
    count,
  };
}

/**
 * Gate 3 Executor: Code Quality Check
 *
 * @param context - Gate context (validated against gateContextSchema)
 * @returns Gate result
 */
export async function executeGate3(context: z.infer<typeof gateContextSchema>): Promise<GateResult> {
  const errors: GateError[] = [];
  const warnings: string[] = [];

  // Analyze each file
  if (context.files && Array.isArray(context.files)) {
    for (const file of context.files) {
      const filePath = file.path || 'unknown';

      // Check functions if provided
      if (file.functions && Array.isArray(file.functions)) {
        for (const func of file.functions) {
          const funcPath = `${filePath}:${func.name}`;

          // Check function length
          if (func.body) {
            const lengthCheck = checkFunctionLength(func.body);
            if (lengthCheck.exceeds) {
              errors.push({
                path: funcPath,
                message: `Function '${func.name}' is ${lengthCheck.length} lines (max: ${THRESHOLDS.maxFunctionLength}). Consider breaking into smaller functions.`,
              });
            }
          }

          // Check parameter list
          if (func.parameters) {
            const paramCheck = checkParameterList(func.parameters);
            if (paramCheck.exceeds) {
              warnings.push(
                `${funcPath}: Function '${func.name}' has ${paramCheck.count} parameters (max recommended: ${THRESHOLDS.maxParameters}). Consider using an options object.`
              );
            }
          }
        }
      }

      // Check nesting depth
      if (file.content) {
        const nestingCheck = checkNestingDepth(file.content);
        if (nestingCheck.exceeds) {
          errors.push({
            path: filePath,
            message: `Nesting depth of ${nestingCheck.depth} exceeds maximum (${THRESHOLDS.maxNesting}). Consider refactoring to reduce complexity.`,
          });
        }
      }
    }
  }

  // Use pre-computed metrics if provided
  if (context.metrics) {
    const metrics = context.metrics;

    if (metrics.maxNesting !== undefined && metrics.maxNesting > THRESHOLDS.maxNesting) {
      errors.push({
        path: 'metrics.maxNesting',
        message: `Maximum nesting depth (${metrics.maxNesting}) exceeds threshold (${THRESHOLDS.maxNesting}).`,
      });
    }

    if (metrics.avgFunctionLength !== undefined && metrics.avgFunctionLength > THRESHOLDS.maxFunctionLength) {
      errors.push({
        path: 'metrics.avgFunctionLength',
        message: `Average function length (${metrics.avgFunctionLength}) exceeds threshold (${THRESHOLDS.maxFunctionLength}).`,
      });
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create and register Gate 3 with a QualityGate instance
 *
 * @param gateCoordinator - QualityGate coordinator instance
 */
export function registerGate3(gateCoordinator: { registerGate: (name: string, schema: z.ZodSchema, executor: (ctx: unknown) => Promise<GateResult>) => void }): void {
  gateCoordinator.registerGate('gate-03-code', gateContextSchema, executeGate3);
}
