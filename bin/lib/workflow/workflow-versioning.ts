/**
 * Workflow Versioning & Migrations - Manage workflow versions and handle breaking changes
 * 
 * Provides semantic versioning for workflows and migration system for upgrades.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getEzAgentsRoot, getWorkflowPath } from '../core.js';
import { defaultLogger as logger } from '../logger/index.js';

export interface WorkflowVersion {
  major: number;
  minor: number;
  patch: number;
}

export interface WorkflowMetadata {
  workflow: string;
  version: string;
  last_updated: string;
  breaking_changes: string[];
  changelog: Record<string, string[]>;
}

export interface Migration {
  from: string;
  to: string;
  description?: string;
  migrate: (workflow: string, context: MigrationContext) => string;
}

export interface MigrationContext {
  workflow: string;
  fromVersion: string;
  toVersion: string;
  metadata: WorkflowMetadata;
}

export interface VersionCheckResult {
  current: string;
  latest: string;
  needs_update: boolean;
  migrations_required: Migration[];
  breaking_changes: string[];
}

/**
 * Parse version string to object
 */
export function parseVersion(version: string): WorkflowVersion | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  
  return {
    major: parseInt(match[1]!, 10),
    minor: parseInt(match[2]!, 10),
    patch: parseInt(match[3]!, 10)
  };
}

/**
 * Convert version object to string
 */
export function versionToString(version: WorkflowVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Compare two versions
 * Returns: -1 (v1 < v2), 0 (v1 == v2), 1 (v1 > v2)
 */
export function compareVersions(v1: string, v2: string): number {
  const ver1 = parseVersion(v1);
  const ver2 = parseVersion(v2);
  
  if (!ver1 || !ver2) return 0;
  
  if (ver1.major !== ver2.major) {
    return ver1.major - ver2.major;
  }
  if (ver1.minor !== ver2.minor) {
    return ver1.minor - ver2.minor;
  }
  return ver1.patch - ver2.patch;
}

/**
 * Extract metadata from workflow file
 */
export function extractWorkflowMetadata(workflowContent: string): WorkflowMetadata | null {
  // Check for frontmatter
  const frontmatterMatch = workflowContent.match(/^---\n([\s\S]*?)\n---/);
  
  if (!frontmatterMatch) {
    return null;
  }
  
  const frontmatter = frontmatterMatch[1]!;
  const metadata: Partial<WorkflowMetadata> = {};
  
  // Parse YAML-like frontmatter
  const lines = frontmatter.split('\n');
  let currentKey: string | null = null;
  let currentValue: string[] = [];
  
  for (const line of lines) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      // Save previous key-value if exists
      if (currentKey && currentValue.length > 0) {
        metadata[currentKey as keyof WorkflowMetadata] = currentValue.join('\n  - ') as any;
      }
      
      currentKey = kvMatch[1]!;
      const value = kvMatch[2]!.trim();
      
      if (value.startsWith('[') && value.endsWith(']')) {
        // Array on single line
        currentValue = value.slice(1, -1).split(',').map(s => s.trim());
      } else if (value) {
        currentValue = [value];
      } else {
        currentValue = [];
      }
    } else if (line.trim().startsWith('- ') && currentKey) {
      currentValue.push(line.trim().substring(2));
    }
  }
  
  // Save last key-value
  if (currentKey && currentValue.length > 0) {
    metadata[currentKey as keyof WorkflowMetadata] = currentValue.join('\n  - ') as any;
  }
  
  if (!metadata.workflow || !metadata.version) {
    return null;
  }
  
  return metadata as WorkflowMetadata;
}

/**
 * Get current version of a workflow
 */
export function getWorkflowVersion(workflowName: string): string | null {
  const workflowPath = getWorkflowPath(workflowName);
  
  if (!fs.existsSync(workflowPath)) {
    return null;
  }
  
  const content = fs.readFileSync(workflowPath, 'utf-8');
  const metadata = extractWorkflowMetadata(content);
  
  return metadata?.version || null;
}

/**
 * Check if workflow needs update
 */
export function checkWorkflowVersion(workflowName: string, latestVersion: string): VersionCheckResult {
  const currentVersion = getWorkflowVersion(workflowName) || '0.0.0';
  const needsUpdate = compareVersions(currentVersion, latestVersion) < 0;
  
  const result: VersionCheckResult = {
    current: currentVersion,
    latest: latestVersion,
    needs_update: needsUpdate,
    migrations_required: [],
    breaking_changes: []
  };
  
  if (needsUpdate) {
    // Find required migrations
    result.migrations_required = getRequiredMigrations(workflowName, currentVersion, latestVersion);
    
    // Collect breaking changes
    for (const migration of result.migrations_required) {
      if (migration.description) {
        result.breaking_changes.push(`${migration.from} → ${migration.to}: ${migration.description}`);
      }
    }
  }
  
  return result;
}

/**
 * Get migrations required between versions
 */
export function getRequiredMigrations(
  workflowName: string,
  fromVersion: string,
  toVersion: string
): Migration[] {
  const allMigrations = getMigrationsForWorkflow(workflowName);
  const required: Migration[] = [];
  
  for (const migration of allMigrations) {
    if (compareVersions(migration.from, fromVersion) > 0 &&
        compareVersions(migration.to, toVersion) <= 0) {
      required.push(migration);
    }
  }
  
  // Sort by version order
  required.sort((a, b) => compareVersions(a.from, b.from));
  
  return required;
}

/**
 * Apply migrations to workflow content
 */
export function applyMigrations(
  workflowContent: string,
  migrations: Migration[],
  metadata: WorkflowMetadata
): string {
  let content = workflowContent;
  const context: MigrationContext = {
    workflow: metadata.workflow,
    fromVersion: '',
    toVersion: '',
    metadata
  };
  
  for (const migration of migrations) {
    try {
      context.fromVersion = migration.from;
      context.toVersion = migration.to;
      
      content = migration.migrate(content, context);
      
      logger.info('Applied migration', {
        workflow: metadata.workflow,
        from: migration.from,
        to: migration.to
      });
    } catch (error) {
      const err = error as Error;
      logger.error('Migration failed', {
        workflow: metadata.workflow,
        from: migration.from,
        to: migration.to,
        error: err.message
      });
      throw new Error(`Migration ${migration.from} → ${migration.to} failed: ${err.message}`);
    }
  }
  
  return content;
}

/**
 * Update workflow version metadata
 */
export function updateWorkflowMetadata(
  workflowContent: string,
  newVersion: string,
  changelogEntry?: string
): string {
  const metadata = extractWorkflowMetadata(workflowContent);
  
  if (!metadata) {
    logger.warn('No metadata found, cannot update version');
    return workflowContent;
  }
  
  // Update version
  let updated = workflowContent.replace(
    /^version:\s*[\d.]+/m,
    `version: ${newVersion}`
  );
  
  // Update last_updated
  updated = updated.replace(
    /^last_updated:\s*[\d-]+/m,
    `last_updated: ${new Date().toISOString().split('T')[0]}`
  );
  
  // Add changelog entry if provided
  if (changelogEntry) {
    const changelogPattern = /^changelog:\s*\n/m;
    if (changelogPattern.test(updated)) {
      // Add to existing changelog
      updated = updated.replace(
        changelogPattern,
        `changelog:\n  - ${newVersion}: ${changelogEntry}\n`
      );
    } else {
      // Add changelog section
      updated = updated.replace(
        /^last_updated:\s*[\d-]+/m,
        `last_updated: ${new Date().toISOString().split('T')[0]}\nchangelog:\n  - ${newVersion}: ${changelogEntry}`
      );
    }
  }
  
  return updated;
}

/**
 * Get migrations for a specific workflow
 */
function getMigrationsForWorkflow(workflowName: string): Migration[] {
  // Built-in migrations for common patterns
  const builtInMigrations: Migration[] = [
    {
      from: '1.0.0',
      to: '2.0.0',
      description: 'Migrated to XML tag format',
      migrate: (content: string) => {
        // Convert markdown headers to XML tags for workflow sections
        return content
          .replace(/^##\s+Objective\s*$/gm, '<objective>')
          .replace(/^##\s+Process\s*$/gm, '</objective>\n\n<process>')
          .replace(/^##\s+Verification\s*$/gm, '</process>\n\n<verify>')
          .replace(/^##\s+Success Criteria\s*$/gm, '</verify>\n\n<success_criteria>')
          .replace(/^(?!<|##|\s*$).*$/gm, (match) => {
            // Preserve non-header, non-tag content
            return match;
          });
      }
    },
    {
      from: '2.0.0',
      to: '2.1.0',
      description: 'Added auto-advance support',
      migrate: (content: string) => {
        // Add auto-advance configuration if not present
        if (!content.includes('auto-advance')) {
          content = content.replace(
            /(<objective>)/,
            `$1\n<!-- auto-advance: enabled -->`
          );
        }
        return content;
      }
    }
  ];
  
  // Load workflow-specific migrations if they exist
  const migrationsPath = path.join(getEzAgentsRoot(), 'workflows', 'migrations', `${workflowName}.ts`);
  
  if (fs.existsSync(migrationsPath)) {
    try {
      // Would need dynamic import for actual loading
      logger.debug('Workflow-specific migrations found', { workflow: workflowName });
    } catch (error) {
      logger.warn('Failed to load workflow-specific migrations', { workflow: workflowName });
    }
  }
  
  return builtInMigrations;
}

/**
 * Validate workflow version compatibility
 */
export function validateVersionCompatibility(
  workflowName: string,
  requiredVersion: string
): boolean {
  const currentVersion = getWorkflowVersion(workflowName);
  
  if (!currentVersion) {
    return false;
  }
  
  // Check if current version meets minimum requirement
  return compareVersions(currentVersion, requiredVersion) >= 0;
}

/**
 * Get version history for a workflow
 */
export function getVersionHistory(workflowName: string): Record<string, string[]> {
  const workflowPath = getWorkflowPath(workflowName);
  
  if (!fs.existsSync(workflowPath)) {
    return {};
  }
  
  const content = fs.readFileSync(workflowPath, 'utf-8');
  const metadata = extractWorkflowMetadata(content);
  
  return metadata?.changelog || {};
}

/**
 * Format version info for display
 */
export function formatVersionInfo(workflowName: string): string {
  const version = getWorkflowVersion(workflowName);
  const history = getVersionHistory(workflowName);
  
  if (!version) {
    return `Workflow "${workflowName}" has no version information`;
  }
  
  const lines: string[] = [];
  lines.push(`${workflowName} v${version}`);
  lines.push('');
  
  if (Object.keys(history).length > 0) {
    lines.push('Changelog:');
    for (const [ver, changes] of Object.entries(history)) {
      lines.push(`  ${ver}:`);
      for (const change of changes) {
        lines.push(`    - ${change}`);
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Create a new workflow with version metadata
 */
export function createWorkflowTemplate(
  workflowName: string,
  version: string = '1.0.0',
  content: string = ''
): string {
  const frontmatter = `---
workflow: ${workflowName}
version: ${version}
last_updated: ${new Date().toISOString().split('T')[0]}
breaking_changes: []
changelog:
  - ${version}: Initial version
---

`;
  
  return frontmatter + content;
}

/**
 * Migration builder helpers
 */
export const MigrationHelpers = {
  /**
   * Add frontmatter to workflow without it
   */
  addFrontmatter: (content: string, workflowName: string, version: string): string => {
    const frontmatter = `---
workflow: ${workflowName}
version: ${version}
last_updated: ${new Date().toISOString().split('T')[0]}
breaking_changes: []
changelog:
  - ${version}: Added version tracking
---

`;
    return frontmatter + content;
  },
  
  /**
   * Convert header format to XML tags
   */
  headersToXml: (content: string, mappings: Record<string, string>): string => {
    let result = content;
    for (const [header, tag] of Object.entries(mappings)) {
      const pattern = new RegExp(`^##\\s+${header}\\s*$`, 'gm');
      result = result.replace(pattern, tag);
    }
    return result;
  },
  
  /**
   * Add section to workflow
   */
  addSection: (content: string, sectionName: string, sectionContent: string): string => {
    const sectionPattern = new RegExp(`(<${sectionName}>)`, 'i');
    if (sectionPattern.test(content)) {
      return content; // Section already exists
    }
    return content.replace(/(<\/process>)/i, `${sectionContent}\n$1`);
  },
  
  /**
   * Remove deprecated section
   */
  removeSection: (content: string, sectionName: string): string => {
    const sectionPattern = new RegExp(`<${sectionName}>[\\s\\S]*?<\\/${sectionName}>`, 'gi');
    return content.replace(sectionPattern, '');
  }
};
