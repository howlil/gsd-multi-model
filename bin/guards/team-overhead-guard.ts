/**
 * EDGE-06: Team Overhead Guard
 *
 * Detects organizational change suggestions.
 * Prevents suggesting team restructuring without explicit need.
 */

// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────

interface OrgChangeSuggestion {
  keyword: string;
  context: string;
}

interface OrgChangeDetectionResult {
  hasOrgChanges: boolean;
  suggestions: OrgChangeSuggestion[];
  keywordCount: number;
  overhead: string;
  recommendation: string;
}

interface FlaggedTeamRestructureResult extends OrgChangeDetectionResult {
  flagged: boolean;
  severity: 'low' | 'medium' | 'high';
  action: string;
}

interface TeamOverheadCheckResult extends OrgChangeDetectionResult {
  summary: string;
  actionable: boolean;
  severity?: 'low' | 'medium' | 'high';
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

// Organizational change keywords
const ORG_CHANGE_KEYWORDS: readonly string[] = [
  // Team structure
  'team structure', 'reorganize team', 'restructure team', 'new team',
  'scrum team', 'squad', 'tribe', 'chapter', 'guild',

  // Roles and positions
  'new role', 'create role', 'hire', 'recruiting', 'job description',
  'team lead', 'tech lead', 'engineering manager', 'product owner',
  'scrum master', 'architect role', 'dedicated person',

  // Meetings and ceremonies
  'daily standup', 'sprint planning', 'retrospective', 'sprint review',
  'new meeting', 'weekly sync', 'bi-weekly', 'ceremony',

  // Process changes
  'change process', 'new workflow', 'approval process', 'sign-off',
  'gate keeping', 'code review process', 'pr review requirement',

  // Communication
  'communication channel', 'slack channel', 'teams channel',
  'reporting structure', 'escalation path', 'chain of command',

  // Documentation overhead
  'documentation requirement', 'design doc', 'rfc process',
  'architecture review board', 'change advisory board'
];

// Legitimate technical suggestions (not org changes)
const TECHNICAL_SUGGESTIONS: readonly string[] = [
  'add test', 'write test', 'create component', 'implement feature',
  'refactor', 'optimize', 'fix bug', 'update dependency',
  'add logging', 'add monitoring', 'improve performance'
];

// ─────────────────────────────────────────────
// Main Functions
// ─────────────────────────────────────────────

/**
 * Extract context around a keyword
 * @param text - Full text
 * @param keyword - Keyword to find context for
 * @returns Context around keyword
 */
export function extractContext(text: string, keyword: string): string {
  const index = text.toLowerCase().indexOf(keyword);
  if (index === -1) return '';

  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + keyword.length + 100);

  return text.substring(start, end)
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect organizational changes in text
 * @param output - AI generated text
 * @returns Org change detection result
 */
export function detectOrgChanges(output: string): OrgChangeDetectionResult {
  const lowerOutput = output.toLowerCase();
  const foundKeywords: string[] = [];
  const suggestions: OrgChangeSuggestion[] = [];

  // Check for org change keywords
  for (const keyword of ORG_CHANGE_KEYWORDS) {
    if (lowerOutput.includes(keyword)) {
      foundKeywords.push(keyword);

      // Extract the surrounding suggestion
      const context = extractContext(output, keyword);
      suggestions.push({
        keyword,
        context: context.trim()
      });
    }
  }

  // Check if these are actually org changes vs technical suggestions
  const isTechnicalOnly = TECHNICAL_SUGGESTIONS.some(tech =>
    lowerOutput.includes(tech) && foundKeywords.length === 0
  );

  return {
    hasOrgChanges: foundKeywords.length > 0 && !isTechnicalOnly,
    suggestions,
    keywordCount: foundKeywords.length,
    overhead: estimateOverhead(suggestions),
    recommendation: foundKeywords.length > 0
      ? 'Consider if organizational changes are necessary for this task'
      : 'No organizational changes detected'
  };
}

/**
 * Flag team restructuring suggestions
 * @param suggestion - The suggestion text
 * @returns Flagged suggestion details
 */
export function flagTeamRestructure(suggestion: string): FlaggedTeamRestructureResult {
  const result = detectOrgChanges(suggestion);

  return {
    flagged: result.hasOrgChanges,
    ...result,
    severity: result.keywordCount > 3
      ? 'high'
      : result.keywordCount > 1
        ? 'medium'
        : 'low',
    action: result.hasOrgChanges
      ? 'Requires explicit justification and user approval'
      : 'No action needed'
  };
}

/**
 * Check overhead of organizational changes
 * @param suggestions - Array of organizational suggestions
 * @returns Estimated overhead description
 */
export function estimateOverhead(suggestions: OrgChangeSuggestion[]): string {
  if (suggestions.length === 0) {
    return 'No organizational overhead';
  }

  const categories = new Set<string>();

  for (const suggestion of suggestions) {
    if (['team structure', 'reorganize', 'restructure', 'squad', 'tribe'].some(k => suggestion.keyword.includes(k))) {
      categories.add('team-restructure');
    }
    if (['role', 'hire', 'recruit', 'lead', 'manager'].some(k => suggestion.keyword.includes(k))) {
      categories.add('hiring-roles');
    }
    if (['meeting', 'standup', 'ceremony', 'sync'].some(k => suggestion.keyword.includes(k))) {
      categories.add('meeting-overhead');
    }
    if (['process', 'workflow', 'approval', 'sign-off'].some(k => suggestion.keyword.includes(k))) {
      categories.add('process-overhead');
    }
  }

  const overheadEstimates: Record<string, string> = {
    'team-restructure': 'High: Team restructuring has long-term impact',
    'hiring-roles': 'High: New roles require budget and time',
    'meeting-overhead': 'Medium: Recurring time commitment',
    'process-overhead': 'Medium: Ongoing process overhead'
  };

  const estimates = Array.from(categories).map(c => overheadEstimates[c]);

  if (estimates.length === 0) {
    return 'Low: Minor organizational impact';
  }

  return estimates.join('; ');
}

/**
 * Check for team overhead in task context
 * @param taskContext - Task description
 * @returns Team overhead analysis
 */
export function checkOverhead(taskContext: string): TeamOverheadCheckResult {
  const orgChanges = detectOrgChanges(taskContext);
  const flagged = flagTeamRestructure(taskContext);

  return {
    hasOrgChanges: orgChanges.hasOrgChanges,
    suggestions: orgChanges.suggestions,
    overhead: orgChanges.overhead,
    severity: flagged.severity,
    actionable: flagged.flagged,
    keywordCount: orgChanges.keywordCount,
    recommendation: flagged.flagged
      ? 'Remove organizational suggestions or explicitly justify them'
      : 'Task context is appropriate',
    summary: orgChanges.hasOrgChanges
      ? `⚠️  Found ${orgChanges.keywordCount} organizational change suggestion(s)`
      : '✅ No organizational changes detected'
  };
}

/**
 * Full team overhead check
 * @param output - AI generated output
 * @returns Complete team overhead analysis
 */
export function checkTeamOverhead(output: string): TeamOverheadCheckResult {
  const orgChanges = detectOrgChanges(output);

  return {
    ...orgChanges,
    summary: orgChanges.hasOrgChanges
      ? `⚠️  Found ${orgChanges.keywordCount} organizational change suggestion(s)`
      : '✅ No organizational changes detected',
    actionable: orgChanges.hasOrgChanges
  };
}

// ─────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────

export { ORG_CHANGE_KEYWORDS, TECHNICAL_SUGGESTIONS };

// ─────────────────────────────────────────────
// CLI Interface
// ─────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'check') {
    const text = args.slice(1).join(' ') || '';

    if (!text.trim()) {
      console.log('Usage: node team-overhead-guard.ts check <text>');
      console.log('  or:  echo "text" | node team-overhead-guard.ts check');
      process.exit(1);
    }

    const result = checkTeamOverhead(text);

    console.log('Team Overhead Analysis');
    console.log('======================');
    console.log(result.summary);

    if (result.suggestions.length > 0) {
      console.log('');
      console.log('Organizational suggestions found:');
      result.suggestions.forEach((s, i) => {
        console.log(`  ${i + 1}. "${s.context}"`);
        console.log(`     Keyword: ${s.keyword}`);
      });

      console.log('');
      console.log(`Estimated overhead: ${result.overhead}`);
      console.log('');
      console.log('Recommendation:');
      console.log(`  ${result.recommendation}`);
    }

    process.exit(result.hasOrgChanges ? 1 : 0);

  } else if (command === 'keywords') {
    console.log('Organizational change keywords:');
    ORG_CHANGE_KEYWORDS.forEach(k => console.log(`  - ${k}`));
    process.exit(0);

  } else {
    console.log('Usage: node team-overhead-guard.ts <command> [args]');
    console.log('Commands:');
    console.log('  check [text]     - Analyze for organizational changes');
    console.log('  keywords         - List organizational change keywords');
    process.exit(1);
  }
}
