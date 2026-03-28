/**
 * Utils Module
 */

export { fetchUrl, URLFetchService } from './url-fetch.js';
export type { FetchOptions, FetchResult } from './url-fetch.js';

export { renderTemplate } from './template.js';
export type { TemplateContext } from './template.js';

export { testUtils } from './test-utils.js';

// Phase 27: Code Consolidation
// CODE-01 to CODE-06: Code analysis and consolidation utilities
export { CodeConsolidationAnalyzer } from './code-consolidation.js';
export type { DeadCodeResult, DuplicateResult, ImportSuggestion } from './code-consolidation.js';

// CODE-02: Consolidated utilities
export { utils, stringUtils, arrayUtils, objectUtils, fileUtils, promiseUtils, numberUtils } from './consolidated-utils.js';

// Phase 28: Remove Over-Engineering
// SIMPLIFY-01 to SIMPLIFY-07: Code simplification analysis
export { CodeSimplificationAnalyzer } from './code-simplification.js';
export type { SimplificationIssue, FileComplexityMetrics, IssueType } from './code-simplification.js';
