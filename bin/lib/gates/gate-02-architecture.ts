/**
 * Gate 2: Architecture Review
 *
 * Validates architecture against skill recommendations and checks for overengineering.
 *
 * Checks:
 * 1. Structure matches skill recommendations (when skill registry is available)
 * 2. Abstraction layer count is appropriate (< 3 for most projects)
 * 3. No premature optimization patterns (microservices, repository pattern without need)
 * 4. No unnecessary CQRS for simple CRUD operations
 *
 * @module gates/gate-02-architecture
 */

import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Zod schema for a file in the proposed architecture
 */
export const fileSchema = z.object({
  /** File path relative to project root */
  path: z.string(),
  /** File type/category (e.g., 'controller', 'service', 'repository', 'model') */
  type: z.string().optional(),
  /** Abstraction layer depth (0 = root, 1 = first layer, etc.) */
  layer: z.number().int().min(0).optional(),
  /** Dependencies (other files this file depends on) */
  dependencies: z.array(z.string()).optional(),
});

/**
 * Zod schema for architecture component
 */
export const componentSchema = z.object({
  /** Component name */
  name: z.string(),
  /** Component type (e.g., 'controller', 'service', 'repository', 'use-case') */
  type: z.string(),
  /** Layer depth */
  layer: z.number().int().min(0),
  /** Files in this component */
  files: z.array(z.string()).optional(),
});

/**
 * Zod schema for skill recommendation
 */
export const skillRecommendationSchema = z.object({
  /** Skill name */
  skillName: z.string(),
  /** Recommended project structure */
  recommendedStructure: z.array(z.string()).optional(),
  /** Best practices */
  bestPractices: z.array(z.string()).optional(),
  /** Anti-patterns to avoid */
  antiPatterns: z.array(z.string()).optional(),
  /** Maximum recommended abstraction layers */
  maxAbstractionLayers: z.number().int().min(1).optional(),
});

/**
 * Zod schema for the gate context
 */
export const gateContextSchema = z.object({
  /** Proposed project structure (array of files) */
  files: z.array(fileSchema).optional(),
  /** Architecture components */
  components: z.array(componentSchema).optional(),
  /** Project tier/archetype (mvp, medium, enterprise) */
  projectTier: z.enum(['mvp', 'medium', 'enterprise']).optional(),
  /** Skill recommendations (from Skill Registry) */
  skillRecommendations: z.array(skillRecommendationSchema).optional(),
  /** Explicit architecture description */
  architecture: z.object({
    /** Number of abstraction layers */
    abstractionLayers: z.number().int().min(0).optional(),
    /** Patterns used */
    patterns: z.array(z.string()).optional(),
    /** Justification for complex patterns */
    justifications: z.record(z.string(), z.string()).optional(),
  }).optional(),
  /** Simple flags for common patterns */
  hasRepositoryPattern: z.boolean().optional(),
  hasCQRS: z.boolean().optional(),
  hasEventBus: z.boolean().optional(),
  hasMicroservices: z.boolean().optional(),
  /** Event count (for detecting overengineering) */
  eventCount: z.number().int().min(0).optional(),
  /** CRUD operation count */
  crudOperationCount: z.number().int().min(0).optional(),
});

/**
 * Default abstraction layer thresholds by project tier
 */
export const ABSTRACTION_THRESHOLDS = {
  mvp: 2,        // MVP: max 2 layers (e.g., controller → service)
  medium: 3,     // Medium: max 3 layers (e.g., controller → service → repository)
  enterprise: 4, // Enterprise: max 4 layers (e.g., controller → service → repository → domain)
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
 * Count abstraction layers from file structure
 *
 * Analyzes file paths and types to determine the depth of abstraction layers.
 * Common layers: controller → service → repository → model/domain
 *
 * @param files - Array of file objects with path and type
 * @returns Maximum abstraction layer depth
 */
export function countAbstractionLayers(files: Array<{ path?: string; type?: string; layer?: number }>): number {
  if (!files || files.length === 0) {
    return 0;
  }

  // If files have explicit layer property, use the maximum
  const maxLayer = Math.max(...files.map(f => f.layer ?? 0));
  if (maxLayer > 0) {
    return maxLayer;
  }

  // Otherwise, infer from file paths and types
  const layerTypes = new Set<string>();

  for (const file of files) {
    const filePath = file.path || '';
    const fileType = file.type || '';

    // Check type field first
    if (fileType) {
      layerTypes.add(fileType.toLowerCase());
    }

    // Infer from path
    const pathLower = filePath.toLowerCase();
    if (pathLower.includes('/controller') || pathLower.includes('/controllers')) {
      layerTypes.add('controller');
    }
    if (pathLower.includes('/service') || pathLower.includes('/services')) {
      layerTypes.add('service');
    }
    if (pathLower.includes('/repository') || pathLower.includes('/repositories') ||
        pathLower.includes('/dao') || pathLower.includes('/data-access')) {
      layerTypes.add('repository');
    }
    if (pathLower.includes('/use-case') || pathLower.includes('/usecase') ||
        pathLower.includes('/usecase') || pathLower.includes('/commands') ||
        pathLower.includes('/queries') || pathLower.includes('/handlers')) {
      layerTypes.add('use-case');
    }
    if (pathLower.includes('/model') || pathLower.includes('/models') ||
        pathLower.includes('/domain') || pathLower.includes('/entity')) {
      layerTypes.add('model');
    }
    if (pathLower.includes('/middleware')) {
      layerTypes.add('middleware');
    }
  }

  // Define typical layer ordering
  const layerOrder = ['middleware', 'controller', 'use-case', 'service', 'repository', 'model'];

  // Count distinct layers present
  let layerCount = 0;
  for (const layer of layerOrder) {
    if (layerTypes.has(layer)) {
      layerCount++;
    }
  }

  return layerCount;
}

/**
 * Gate 2 Executor: Architecture Review
 *
 * @param context - Gate context (validated against gateContextSchema)
 * @returns Gate result
 */
export async function executeGate2(context: z.infer<typeof gateContextSchema>): Promise<GateResult> {
  const errors: GateError[] = [];
  const warnings: string[] = [];

  // Determine project tier
  const tier = context.projectTier || 'mvp';
  const maxLayers = ABSTRACTION_THRESHOLDS[tier];

  // Count abstraction layers
  let abstractionLayers = context.architecture?.abstractionLayers;
  if (abstractionLayers === undefined && context.files) {
    abstractionLayers = countAbstractionLayers(context.files as Array<{ path?: string; type?: string; layer?: number }>);
  }

  if (abstractionLayers !== undefined) {
    if (abstractionLayers > maxLayers) {
      errors.push({
        path: 'architecture.abstractionLayers',
        message: `Too many abstraction layers (${abstractionLayers}) for ${tier} project. ` +
          `Maximum recommended: ${maxLayers}. Consider flattening architecture.`,
      });
    } else if (abstractionLayers > 3) {
      warnings.push(
        `Architecture has ${abstractionLayers} abstraction layers. ` +
        'Consider simplifying if possible. Layers > 3 often indicate overengineering.'
      );
    }
  }

  // Check for overengineering patterns
  if (context.hasRepositoryPattern) {
    const tier = context.projectTier || 'mvp';
    const crudCount = context.crudOperationCount ?? 0;

    if (tier === 'mvp' && crudCount < 10) {
      errors.push({
        path: 'architecture.patterns',
        message: 'Repository pattern detected in MVP project with simple CRUD operations. ' +
          'Consider using direct data access for MVP tier. Add justification if pattern is necessary.',
      });
    }
  }

  if (context.hasCQRS) {
    const crudCount = context.crudOperationCount ?? 0;
    const eventCount = context.eventCount ?? 0;

    if (crudCount < 15 && eventCount < 5) {
      errors.push({
        path: 'architecture.patterns',
        message: `CQRS pattern detected for simple CRUD application (${crudCount} operations, ${eventCount} events). ` +
          'CQRS adds complexity; consider using for projects with complex read/write separation needs or high event volume.',
      });
    }
  }

  if (context.hasMicroservices && tier === 'mvp') {
    errors.push({
      path: 'architecture.patterns',
      message: 'Microservices architecture in MVP project. ' +
        'Consider monolith-first approach for MVP. Microservices add operational complexity ' +
        'that should be justified by team size, scalability needs, or domain complexity.',
    });
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create and register Gate 2 with a QualityGate instance
 *
 * @param gateCoordinator - QualityGate coordinator instance
 */
export function registerGate2(gateCoordinator: { registerGate: (name: string, schema: z.ZodSchema, executor: (ctx: unknown) => Promise<GateResult>) => void }): void {
  gateCoordinator.registerGate('gate-02-architecture', gateContextSchema, (ctx: unknown) => executeGate2(ctx as z.infer<typeof gateContextSchema>));
}
