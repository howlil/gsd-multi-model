/**
 * Phase & Milestone Module
 *
 * Handles phase management, roadmap, and milestone tracking.
 */

export type { PhaseStatus } from './phase.js';

export { phaseComplete, phaseNextDecimal, findPhaseCmd } from './phase.js';

export { PhaseInfo as RoadmapPhaseInfo, RoadmapAnalysis } from './roadmap.js';
export { roadmapGetPhase, roadmapAnalyze, roadmapUpdatePlanProgress, roadmapUpdatePhaseStatus } from './roadmap.js';

export { Milestone } from './milestone.js';
export type { MilestoneCompleteOptions, RequirementsCompleteResult, MilestoneCompleteResult } from './milestone.js';
export { requirementsMarkComplete, milestoneComplete } from './milestone.js';
