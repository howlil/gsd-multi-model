#!/usr/bin/env node

/**
 * Trade-off Analyzer — Generate trade-off analysis for architecture decisions
 *
 * Provides structured trade-off analysis with:
 * - Options comparison (pros/cons)
 * - Reversibility assessment
 * - Long-term implications
 * - Decision templates
 *
 * Usage:
 *   import { TradeOffAnalyzer, TRADEOFF_TEMPLATE } from './tradeoff-analyzer.js';
 *   const analyzer = new TradeOffAnalyzer();
 *   const analysis = analyzer.generateAnalysis(options, context);
 */

import { Logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface TradeOffOption {
  name: string;
  pros?: string[];
  cons?: string[];
  long_term_implications?: string[];
  context_fit?: string[];
  alignment?: string[];
  [key: string]: any;
}

export interface TradeOffContext {
  decision?: string;
  project_phase?: string;
  team_size?: string;
  deadline?: string;
  user_count?: string;
  compliance?: string;
  implementation_stage?: string;
  [key: string]: any;
}

export interface ReversibilityResult {
  level: string;
  details: string;
  estimated_effort: string;
}

export interface TradeOffAnalysisOptions {
  template?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Trade-off analysis template
 */
export const TRADEOFF_TEMPLATE = `## Trade-off Analysis

**Decision:** {decision}

**Context:**
- Project Phase: {project_phase}
- Team Size: {team_size}
- Deadline: {deadline}
- User Count: {user_count}
- Compliance: {compliance}

**Options Considered:**

{options_section}

**Decision:** {selected_option}

**Rationale:**
{rationale}

**Trade-offs Accepted:**
{tradeoffs_accepted}

**Reversibility:** {reversibility}
- {reversal_details}

**Review Date:** {review_date}
`;

// ─── TradeOffAnalyzer Class ──────────────────────────────────────────────────

export class TradeOffAnalyzer {
  private logger: Logger;
  private template: string;

  /**
   * Create a TradeOffAnalyzer instance
   * @param options - Analyzer options
   */
  constructor(options: TradeOffAnalysisOptions = {}) {
    this.logger = new Logger();
    this.template = options.template || TRADEOFF_TEMPLATE;
  }

  /**
   * Generate trade-off analysis
   * @param options - Options to analyze
   * @param context - Project context
   * @returns Markdown analysis
   */
  generateAnalysis(options: TradeOffOption[], context: TradeOffContext = {}): string {
    const ctx = {
      decision: context.decision || 'Architecture Decision',
      project_phase: context.project_phase || 'Not specified',
      team_size: context.team_size || 'Not specified',
      deadline: context.deadline || 'Not specified',
      user_count: context.user_count || 'Not specified',
      compliance: context.compliance || 'Not specified'
    };

    const optionsSection = this.generateOptionsSection(options);
    const selectedOption = this.selectOption(options, context);
    const rationale = this.generateRationale(selectedOption, context);
    const tradeoffsAccepted = this.generateTradeoffs(selectedOption, options);
    const reversibility = this.assessReversibility(selectedOption, context);
    const reviewDate = this.calculateReviewDate(reversibility.level);

    return this.template
      .replace('{decision}', ctx.decision)
      .replace('{project_phase}', ctx.project_phase)
      .replace('{team_size}', ctx.team_size)
      .replace('{deadline}', ctx.deadline)
      .replace('{user_count}', ctx.user_count)
      .replace('{compliance}', ctx.compliance)
      .replace('{options_section}', optionsSection)
      .replace('{selected_option}', selectedOption.name)
      .replace('{rationale}', rationale)
      .replace('{tradeoffs_accepted}', tradeoffsAccepted)
      .replace('{reversibility}', reversibility.level)
      .replace('{reversal_details}', reversibility.details)
      .replace('{review_date}', reviewDate);
  }

  /**
   * Assess reversibility of a decision
   * @param option - Selected option
   * @param context - Project context
   * @returns Reversibility result with level, details, estimated_effort
   */
  assessReversibility(option: TradeOffOption, context: TradeOffContext = {}): ReversibilityResult {
    const reversibilityFactors: Record<string, { level: string; effort: string }> = {
      'monolith': { level: 'Easy', effort: 'Low - refactor to modules' },
      'modular-monolith': { level: 'Medium', effort: 'Medium - extract modules to services' },
      'microservices': { level: 'Hard', effort: 'High - merge services, consolidate databases' },
      'event-driven': { level: 'Medium', effort: 'Medium - revert to synchronous calls' },
      'queue-based': { level: 'Easy', effort: 'Low - revert to synchronous processing' },
      'caching': { level: 'Easy', effort: 'Low - disable cache layers' },
      'api-gateway': { level: 'Medium', effort: 'Medium - route directly to services' }
    };

    const patternKey = option.name?.toLowerCase().replace(/\s+/g, '-');
    let factor = reversibilityFactors[patternKey] || {
      level: 'Medium',
      effort: 'Unknown - depends on implementation'
    };

    // Adjust based on implementation depth
    if (context.implementation_stage === 'production') {
      factor = {
        level: factor.level === 'Easy' ? 'Medium' : 'Hard',
        effort: `${factor.effort} (production data migration needed)`
      };
    }

    return {
      level: factor.level,
      details: factor.effort,
      estimated_effort: this.estimateEffort(factor.level)
    };
  }

  /**
   * Generate options section
   * @param options - Options to format
   * @returns Markdown section
   */
  private generateOptionsSection(options: TradeOffOption[]): string {
    return options.map((opt, idx) => {
      const pros = opt.pros?.map(p => `  - ${p}`).join('\n') || '  - Not specified';
      const cons = opt.cons?.map(c => `  - ${c}`).join('\n') || '  - Not specified';
      const implications = opt.long_term_implications?.map(i => `  - ${i}`).join('\n') || '  - Not specified';

      return `### Option ${idx + 1}: ${opt.name}

**Pros:**
${pros}

**Cons:**
${cons}

**Long-term Implications:**
${implications}`;
    }).join('\n\n');
  }

  /**
   * Select best option based on context
   * @param options - Options to choose from
   * @param context - Project context
   * @returns Selected option
   */
  private selectOption(options: TradeOffOption[], context: TradeOffContext): TradeOffOption {
    if (options.length === 0) {
      return { name: 'No options provided', pros: [], cons: [] };
    }

    if (options.length === 1) {
      return options[0];
    }

    // Simple scoring based on context
    const scores = options.map(opt => {
      let score = 0;

      // More pros = higher score
      score += (opt.pros?.length || 0) * 2;

      // Fewer cons = higher score
      score -= (opt.cons?.length || 0);

      // Context alignment
      if (opt.context_fit?.includes(context.project_phase || '')) {
        score += 10;
      }

      return { option: opt, score };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores[0].option;
  }

  /**
   * Generate rationale for selected option
   * @param option - Selected option
   * @param context - Project context
   * @returns Rationale text
   */
  private generateRationale(option: TradeOffOption, context: TradeOffContext): string {
    const reasons: string[] = [];

    if (option.pros?.length) {
      reasons.push(`Key advantages: ${option.pros.slice(0, 3).join(', ')}`);
    }

    if (option.context_fit?.includes(context.project_phase || '')) {
      reasons.push(`Well-suited for ${context.project_phase} phase`);
    }

    if (option.alignment?.length) {
      reasons.push(`Aligns with: ${option.alignment.join(', ')}`);
    }

    return reasons.join('. ') || 'Selected based on project requirements and constraints.';
  }

  /**
   * Generate trade-offs accepted
   * @param selected - Selected option
   * @param options - All options
   * @returns Trade-offs text
   */
  private generateTradeoffs(selected: TradeOffOption, options: TradeOffOption[]): string {
    const rejected = options.filter(o => o !== selected);

    if (rejected.length === 0) {
      return 'No alternative options were considered.';
    }

    return rejected.map(opt => {
      const lostBenefits = opt.pros?.join(', ') || 'None';
      return `- By not choosing ${opt.name}, losing: ${lostBenefits}`;
    }).join('\n');
  }

  /**
   * Calculate review date based on reversibility
   * @param level - Reversibility level
   * @returns Review date
   */
  private calculateReviewDate(level: string): string {
    const months: Record<string, number> = {
      'Easy': 6,
      'Medium': 3,
      'Hard': 1
    };

    const reviewMonths = months[level] || 3;
    const reviewDate = new Date();
    reviewDate.setMonth(reviewDate.getMonth() + reviewMonths);

    return reviewDate.toISOString().split('T')[0];
  }

  /**
   * Estimate effort to reverse decision
   * @param level - Reversibility level
   * @returns Effort estimate
   */
  private estimateEffort(level: string): string {
    const efforts: Record<string, string> = {
      'Easy': '1-2 weeks',
      'Medium': '2-6 weeks',
      'Hard': '6+ weeks'
    };
    return efforts[level] || 'Unknown';
  }
}
