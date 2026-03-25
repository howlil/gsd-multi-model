#!/usr/bin/env node

/**
 * Skill Triggers — Trigger-based skill auto-activation
 *
 * Checks skill triggers against context:
 * - Keywords in task description
 * - File patterns in codebase
 * - Commands executed
 * - Stack detection
 * - Project archetypes
 * - Mode matching
 *
 * Usage:
 *   import { SkillTriggerEvaluator, checkTriggers, activateSkillsByTriggers } from './skill-triggers.js';
 *   const evaluator = new SkillTriggerEvaluator();
 *   const shouldActivate = evaluator.evaluate(skill, context);
 */

import { minimatch } from 'minimatch';
import type { Skill } from './skill-registry.js';

/**
 * Trigger context structure
 */
export interface TriggerContext {
  taskDescription?: string;
  codebaseFiles?: string[];
  executedCommands?: string[];
  stack?: string | { language: string; framework: string; version?: string };
  projectType?: string;
  mode?: string;
  [key: string]: unknown;
}

/**
 * Trigger evaluation result
 */
export interface TriggerEvaluationResult {
  triggered: boolean;
  matchedTrigger?: string;
  confidence: number;
}

/**
 * SkillTriggerEvaluator class for evaluating skill triggers
 */
export class SkillTriggerEvaluator {
  /**
   * Evaluate if a skill's triggers match the context
   * @param skill - Skill object with triggers
   * @param context - Context object
   * @returns True if skill should activate
   */
  evaluate(skill: Skill, context: TriggerContext): boolean {
    const { triggers } = skill;
    if (!triggers) return false;

    // Keyword matching in task description
    if (triggers.keywords) {
      const taskText = (context.taskDescription || '').toLowerCase();
      const keywordMatch = triggers.keywords.some((k) => taskText.includes(k.toLowerCase()));
      if (keywordMatch) return true;
    }

    // File pattern matching (requires codebase scan)
    if (triggers.filePatterns && context.codebaseFiles) {
      const matchingFiles = context.codebaseFiles.filter((f) =>
        triggers.filePatterns!.some((pattern) => minimatch(f, pattern))
      );
      if (matchingFiles.length > 0) return true;
    }

    // Command matching
    if (triggers.commands && context.executedCommands) {
      const commandMatch = triggers.commands.some((cmd) =>
        context.executedCommands!.some((execCmd) => execCmd.includes(cmd))
      );
      if (commandMatch) return true;
    }

    // Stack matching
    if (triggers.stack && context.stack) {
      const stackStr =
        typeof context.stack === 'string'
          ? context.stack
          : `${context.stack.language}/${context.stack.framework}`;
      if (triggers.stack === stackStr) return true;
    }

    // Project archetype matching
    if (triggers.projectArchetypes && context.projectType) {
      if (triggers.projectArchetypes.includes(context.projectType)) return true;
    }

    // Mode matching
    if (triggers.modes && context.mode) {
      if (triggers.modes.includes(context.mode)) return true;
    }

    return false;
  }

  /**
   * Evaluate multiple triggers against context
   * @param triggers - Array of trigger strings
   * @param context - Context string
   * @returns True if any trigger matches
   */
  async evaluateTriggers(triggers: string[], context: string): Promise<boolean> {
    const contextLower = context.toLowerCase();
    for (const trigger of triggers) {
      if (contextLower.includes(trigger.toLowerCase())) {
        return true;
      }
    }
    return false;
  }

  /**
   * Evaluate skill with detailed result
   * @param skill - Skill object with triggers
   * @param context - Context object
   * @returns Trigger evaluation result with confidence
   */
  evaluateWithResult(skill: Skill, context: TriggerContext): TriggerEvaluationResult {
    const { triggers } = skill;
    if (!triggers) {
      return { triggered: false, confidence: 0 };
    }

    let matchCount = 0;
    let totalChecks = 0;
    let matchedTrigger: string | undefined;

    // Keyword matching
    if (triggers.keywords) {
      const taskText = (context.taskDescription || '').toLowerCase();
      for (const keyword of triggers.keywords) {
        totalChecks++;
        if (taskText.includes(keyword.toLowerCase())) {
          matchCount++;
          matchedTrigger = `keyword:${keyword}`;
        }
      }
    }

    // File pattern matching
    if (triggers.filePatterns && context.codebaseFiles) {
      for (const pattern of triggers.filePatterns) {
        totalChecks++;
        const matches = context.codebaseFiles.filter((f) => minimatch(f, pattern));
        if (matches.length > 0) {
          matchCount++;
          matchedTrigger = `filePattern:${pattern}`;
        }
      }
    }

    // Command matching
    if (triggers.commands && context.executedCommands) {
      for (const cmd of triggers.commands) {
        totalChecks++;
        if (context.executedCommands.some((execCmd) => execCmd.includes(cmd))) {
          matchCount++;
          matchedTrigger = `command:${cmd}`;
        }
      }
    }

    // Stack matching
    if (triggers.stack && context.stack) {
      totalChecks++;
      const stackStr =
        typeof context.stack === 'string'
          ? context.stack
          : `${context.stack.language}/${context.stack.framework}`;
      if (triggers.stack === stackStr) {
        matchCount++;
        matchedTrigger = `stack:${stackStr}`;
      }
    }

    // Project archetype matching
    if (triggers.projectArchetypes && context.projectType) {
      for (const archetype of triggers.projectArchetypes) {
        totalChecks++;
        if (archetype === context.projectType) {
          matchCount++;
          matchedTrigger = `archetype:${archetype}`;
        }
      }
    }

    // Mode matching
    if (triggers.modes && context.mode) {
      for (const mode of triggers.modes) {
        totalChecks++;
        if (mode === context.mode) {
          matchCount++;
          matchedTrigger = `mode:${mode}`;
        }
      }
    }

    const confidence = totalChecks > 0 ? (matchCount / totalChecks) * 100 : 0;

    return {
      triggered: matchCount > 0,
      matchedTrigger,
      confidence: Math.round(confidence * 100) / 100
    };
  }
}

/**
 * Check if a skill's triggers match the context (backward compatibility)
 * @param skill - Skill object with triggers
 * @param context - Context object
 * @returns True if skill should activate
 * @deprecated Use SkillTriggerEvaluator.evaluate() instead
 */
export function checkTriggers(skill: Skill, context: TriggerContext): boolean {
  const evaluator = new SkillTriggerEvaluator();
  return evaluator.evaluate(skill, context);
}

/**
 * Activate skills whose triggers match the context (backward compatibility)
 * @param skills - Array of skill objects
 * @param context - Context object
 * @returns Array of skills whose triggers matched
 * @deprecated Use SkillTriggerEvaluator.evaluate() instead
 */
export function activateSkillsByTriggers(skills: Skill[], context: TriggerContext): Skill[] {
  const evaluator = new SkillTriggerEvaluator();
  return skills.filter((skill) => evaluator.evaluate(skill, context));
}
