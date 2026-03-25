#!/usr/bin/env node

/**
 * Skill Resolver — Conflict resolution for competing skill recommendations
 *
 * Provides systematic conflict resolution with:
 * - Priority rules (security > speed, maintainability > novelty)
 * - Context-weighted scoring
 * - Trade-off analysis generation
 * - Escalation logic for irreconcilable conflicts
 * - Decision audit trail
 *
 * Usage:
 *   import { SkillResolver, PRIORITY_RULES } from './skill-resolver.js';
 *   const resolver = new SkillResolver({ context: { project_phase: 'MVP' } });
 *   const result = resolver.resolve(skills, context);
 */

import { defaultLogger as logger } from './logger.js';
import type { Skill } from './skill-registry.js';
import { LogExecution, ValidateInput } from './decorators/index.js';
import { EventBus } from './observer/EventBus.js';

/**
 * Priority rule definition
 */
interface PriorityRule {
  higher: string;
  lower: string;
  priority: number;
  rationale: string;
  example: string;
  absolute: boolean;
  context?: string[];
}

/**
 * Recommendation structure
 */
interface Recommendation {
  skillName: string;
  aspect: string;
  value: string;
  tags: string[];
}

/**
 * Conflict structure
 */
interface Conflict {
  aspect: string;
  type: string;
  recommendations: Recommendation[];
  skills: string[];
}

/**
 * Resolution result
 */
interface Resolution {
  winner: Recommendation;
  rationale: string;
  example?: string;
  rule: string | null;
  escalated: boolean;
}

/**
 * Decision log entry
 */
interface DecisionLogEntry {
  conflict?: Conflict;
  resolution?: Resolution;
  context: Record<string, unknown>;
  timestamp: string;
}

/**
 * Resolve result structure
 */
export interface ResolveResult {
  decision: Array<{ aspect: string; decision: Recommendation; rejected: Recommendation[] }> | Recommendation[];
  rationale: string;
  tradeoffs: Array<{ aspect: string; chosen: string; rejected: string[]; rationale: string }>;
  escalated: boolean;
  conflicts: Conflict[];
}

/**
 * Priority rules for conflict resolution
 * Higher priority value wins in conflicts
 */
export const PRIORITY_RULES: Record<string, PriorityRule> = {
  'security > speed': {
    higher: 'security',
    lower: 'speed',
    priority: 100,
    rationale: 'Security vulnerabilities are costly to fix post-release',
    example: "Don't skip input validation to meet deadline",
    absolute: true
  },
  'security > convenience': {
    higher: 'security',
    lower: 'convenience',
    priority: 95,
    rationale: 'User convenience should not compromise security',
    example: 'Require MFA even if adds friction',
    absolute: true
  },
  'maintainability > novelty': {
    higher: 'maintainability',
    lower: 'novelty',
    priority: 90,
    rationale: 'New tech should be proven, not just novel',
    example: 'Use stable Laravel over bleeding-edge framework',
    absolute: true
  },
  'data integrity > performance': {
    higher: 'data-integrity',
    lower: 'performance',
    priority: 95,
    rationale: 'Wrong fast answers are worse than slow correct ones',
    example: 'Use transactions even if slower',
    absolute: true
  },
  'compliance > feature completeness': {
    higher: 'compliance',
    lower: 'feature-completeness',
    priority: 100,
    rationale: 'Regulatory violations can shut down business',
    example: 'Implement GDPR consent before launching feature',
    absolute: true
  },
  'delivery speed > ideal architecture (for POC/MVP)': {
    higher: 'delivery-speed',
    lower: 'ideal-architecture',
    priority: 80,
    context: ['POC', 'MVP'],
    rationale: 'POCs need validation, not perfection',
    example: 'Monolith is fine for MVP validation',
    absolute: false
  },
  'scalability > simplicity (when scale is proven need)': {
    higher: 'scalability',
    lower: 'simplicity',
    priority: 85,
    context: ['scale-up', 'enterprise'],
    rationale: 'If you have 1M users, invest in scaling',
    example: 'Add caching layer when queries slow under load',
    absolute: false
  },
  'user experience > technical purity': {
    higher: 'user-experience',
    lower: 'technical-purity',
    priority: 75,
    rationale: 'Users do not care about clean code',
    example: 'Add denormalization for faster page loads',
    absolute: false
  }
} as const;

/**
 * Conflict types recognized by the resolver
 */
export const CONFLICT_TYPES = [
  'Security vs Speed',
  'Security vs Convenience',
  'Maintainability vs Delivery',
  'Performance vs Simplicity',
  'Data Integrity vs Performance',
  'Compliance vs Feature Completeness',
  'Ideal Architecture vs Constraints',
  'Feature Completeness vs Deadline',
  'User Experience vs Technical Purity',
  'Unknown'
] as const;

/**
 * Conflict type union
 */
export type ConflictType = (typeof CONFLICT_TYPES)[number];

/**
 * Skill Resolver class for conflict resolution
 */
export class SkillResolver {
  private priorityRules: Record<string, PriorityRule>;
  private context: Record<string, unknown>;
  private logger: typeof logger;
  private decisionLog: DecisionLogEntry[];
  private eventBus: EventBus;

  /**
   * Create a SkillResolver instance
   * @param options - Resolver options
   * @param options.priorityRules - Override default priority rules
   * @param options.context - Project context for resolution
   */
  constructor(options: {
    priorityRules?: Record<string, PriorityRule>;
    context?: Record<string, unknown>;
  } = {}) {
    this.priorityRules = { ...PRIORITY_RULES, ...options.priorityRules };
    this.context = options.context || {};
    this.logger = logger;
    this.decisionLog = [];
    this.eventBus = EventBus.getInstance();
  }

  /**
   * Detect conflicts between skill recommendations
   * @param skills - Array of activated skills
   * @returns { hasConflict, conflicts }
   */
  @LogExecution('SkillResolver.detectConflict', { logParams: false })
  detectConflict(skills: Skill[]): { hasConflict: boolean; conflicts: Conflict[] } {
    const conflicts: Conflict[] = [];
    const recommendations = this._collectRecommendations(skills);

    // Emit skill match event
    this.eventBus.emit('skill:match', {
      query: 'conflict_detection',
      matches: recommendations.length,
      timestamp: Date.now()
    });

    // Check for conflicting recommendations on same aspect
    const aspectMap = new Map<string, Recommendation[]>();
    for (const rec of recommendations) {
      const aspect = rec.aspect;
      if (!aspectMap.has(aspect)) {
        aspectMap.set(aspect, []);
      }
      aspectMap.get(aspect)!.push(rec);
    }

    // Find aspects with conflicting recommendations
    for (const [aspect, recs] of Array.from(aspectMap)) {
      if (recs.length > 1) {
        const values = new Set(recs.map(r => r.value));
        if (values.size > 1) {
          conflicts.push({
            aspect,
            type: this._inferConflictType(recs),
            recommendations: recs,
            skills: Array.from(new Set(recs.map(r => r.skillName)))
          });
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts
    };
  }

  /**
   * Classify a conflict into a known type
   * @param conflict - Conflict object
   * @returns Conflict type
   */
  @LogExecution('SkillResolver.classifyConflict', { logParams: false })
  classifyConflict(conflict: Conflict): ConflictType {
    const { type, recommendations } = conflict;

    // Check recommendation tags for conflict indicators
    const tags = recommendations.flatMap(r => r.tags || []);

    if (tags.includes('security') && (tags.includes('speed') || tags.includes('delivery'))) {
      return 'Security vs Speed';
    }
    if (tags.includes('security') && tags.includes('convenience')) {
      return 'Security vs Convenience';
    }
    if (tags.includes('maintainability') && tags.includes('delivery')) {
      return 'Maintainability vs Delivery';
    }
    if (tags.includes('performance') && tags.includes('simplicity')) {
      return 'Performance vs Simplicity';
    }
    if (tags.includes('data-integrity') && tags.includes('performance')) {
      return 'Data Integrity vs Performance';
    }
    if (tags.includes('compliance') && tags.includes('feature-completeness')) {
      return 'Compliance vs Feature Completeness';
    }
    if (tags.includes('ideal-architecture') && tags.includes('constraints')) {
      return 'Ideal Architecture vs Constraints';
    }
    if (tags.includes('user-experience') && tags.includes('technical-purity')) {
      return 'User Experience vs Technical Purity';
    }

    return (type || 'Unknown') as ConflictType;
  }

  /**
   * Apply priority rules to resolve a conflict
   * @param conflict - Classified conflict
   * @param context - Project context
   * @returns Resolution with winner and rationale
   */
  @LogExecution('SkillResolver.applyPriorityRules', { logParams: false })
  applyPriorityRules(conflict: Conflict, context: Record<string, unknown> = {}): Resolution {
    const classification = this.classifyConflict(conflict);
    const ctx = { ...this.context, ...context };

    // Find applicable priority rule
    let applicableRule: (PriorityRule & { key: string }) | null = null;
    for (const [ruleKey, rule] of Object.entries(this.priorityRules)) {
      if (this._ruleMatchesConflict(ruleKey, classification, ctx)) {
        applicableRule = { key: ruleKey, ...rule };
        break;
      }
    }

    if (!applicableRule) {
      // No applicable rule - return first recommendation as default
      const firstRec = conflict.recommendations[0];
      if (!firstRec) {
        throw new Error('Conflict has no recommendations');
      }
      return {
        winner: firstRec,
        rationale: 'No applicable priority rule - using default recommendation',
        rule: null,
        escalated: true
      };
    }

    // Find winning recommendation based on rule
    const winner = this._findRecommendationByPriority(
      conflict.recommendations,
      applicableRule.higher,
      ctx
    );

    return {
      winner,
      rationale: applicableRule.rationale,
      example: applicableRule.example,
      rule: applicableRule.key,
      escalated: false
    };
  }

  /**
   * Resolve conflicts between skills
   * @param skills - Array of activated skills
   * @param context - Project context
   * @returns { decision, rationale, tradeoffs, escalated }
   */
  @ValidateInput((skills: Skill[], context: Record<string, unknown>) => {
    if (!Array.isArray(skills)) throw new Error('Skills must be an array');
  })
  @LogExecution('SkillResolver.resolve', { logParams: false, logResult: false })
  resolve(skills: Skill[], context: Record<string, unknown> = {}): ResolveResult {
    const ctx = { ...this.context, ...context };
    
    // Emit skill trigger event for each skill
    for (const skill of skills) {
      this.eventBus.emit('skill:trigger', {
        skillName: skill.name,
        trigger: 'resolve',
        context: JSON.stringify(ctx)
      });
    }
    
    const conflictResult = this.detectConflict(skills);

    if (!conflictResult.hasConflict) {
      // No conflicts - return all recommendations
      return {
        decision: this._collectRecommendations(skills),
        rationale: 'No conflicts detected between skill recommendations',
        tradeoffs: [],
        escalated: false,
        conflicts: []
      };
    }

    const decisions: Array<{ aspect: string; decision: Recommendation; rejected: Recommendation[] }> = [];
    const tradeoffs: Array<{ aspect: string; chosen: string; rejected: string[]; rationale: string }> = [];
    let escalated = false;

    for (const conflict of conflictResult.conflicts) {
      const resolution = this.applyPriorityRules(conflict, ctx);

      decisions.push({
        aspect: conflict.aspect,
        decision: resolution.winner,
        rejected: conflict.recommendations.filter(r => r !== resolution.winner)
      });

      if (resolution.escalated) {
        escalated = true;
      }

      tradeoffs.push({
        aspect: conflict.aspect,
        chosen: resolution.winner.value,
        rejected: conflict.recommendations
          .filter(r => r !== resolution.winner)
          .map(r => r.value),
        rationale: resolution.rationale
      });

      // Log decision for audit trail
      this.logDecision({
        conflict,
        resolution,
        context: ctx,
        timestamp: new Date().toISOString()
      });
    }

    return {
      decision: decisions,
      rationale: escalated
        ? 'Some conflicts required escalation due to no applicable priority rules'
        : 'All conflicts resolved using priority rules',
      tradeoffs,
      escalated,
      conflicts: conflictResult.conflicts
    };
  }

  /**
   * Log a decision for audit trail
   * @param decision - Decision object
   */
  @LogExecution('SkillResolver.logDecision', { logParams: false })
  logDecision(decision: DecisionLogEntry): void {
    this.decisionLog.push(decision);
    const errorMessage = decision.conflict?.type || 'Unknown';
    const resolutionRule = decision.resolution?.rule || 'Unknown';
    this.logger.info('Conflict resolution decision logged', {
      conflictType: errorMessage,
      resolution: resolutionRule,
      escalated: decision.resolution?.escalated,
      timestamp: decision.timestamp
    });
  }

  /**
   * Get decision log
   * @returns Array of logged decisions
   */
  getDecisionLog(): DecisionLogEntry[] {
    return this.decisionLog;
  }

  /**
   * Clear decision log
   */
  clearDecisionLog(): void {
    this.decisionLog = [];
  }

  /**
   * Collect all recommendations from skills
   * @param skills - Array of skills
   * @returns Array of recommendations
   * @private
   */
  private _collectRecommendations(skills: Skill[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const skill of skills) {
      if (skill.workflow) {
        for (const [phase, actions] of Object.entries(skill.workflow)) {
          if (Array.isArray(actions)) {
            for (const action of actions) {
              recommendations.push({
                skillName: skill.name,
                aspect: phase,
                value: action,
                tags: skill.tags || []
              });
            }
          }
        }
      }

      if (skill.best_practices) {
        for (const practice of skill.best_practices) {
          recommendations.push({
            skillName: skill.name,
            aspect: 'best_practice',
            value: practice,
            tags: skill.tags || []
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Infer conflict type from recommendations
   * @param recs - Recommendations
   * @returns Conflict type
   * @private
   */
  private _inferConflictType(recs: Recommendation[]): string {
    const tags = recs.flatMap(r => r.tags || []);

    if (tags.includes('security')) return 'Security vs Speed';
    if (tags.includes('maintainability')) return 'Maintainability vs Delivery';
    if (tags.includes('performance')) return 'Performance vs Simplicity';

    return 'Unknown';
  }

  /**
   * Check if a rule matches a conflict
   * @param ruleKey - Rule key
   * @param conflictType - Conflict type
   * @param context - Project context
   * @returns True if rule applies
   * @private
   */
  private _ruleMatchesConflict(
    ruleKey: string,
    conflictType: string,
    context: Record<string, unknown>
  ): boolean {
    const rule = this.priorityRules[ruleKey];
    if (!rule) return false;

    // Check if rule has context requirements
    if (rule.context && !rule.context.includes(context.project_phase as string)) {
      return false;
    }

    // Check if rule matches conflict type
    const conflictTypeBase = conflictType.toLowerCase().split(' vs ')[0];
    const ruleMatches = ruleKey.toLowerCase().includes(conflictTypeBase ?? '');
    return ruleMatches;
  }

  /**
   * Find recommendation matching priority
   * @param recs - Recommendations
   * @param priority - Priority to match
   * @param context - Project context
   * @returns Matching recommendation
   * @private
   */
  private _findRecommendationByPriority(
    recs: Recommendation[],
    priority: string,
    _context: Record<string, unknown>
  ): Recommendation {
    for (const rec of recs) {
      if (rec.tags?.includes(priority)) {
        return rec;
      }
    }
    // Fallback to first recommendation
    return recs[0]!;
  }
}
