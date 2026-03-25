#!/usr/bin/env node

/**
 * Session Export — Export session data for model handoff
 *
 * Supports markdown and JSON export formats
 */

import { SessionExportError, SessionNotFoundError } from './session-errors.js';
import { safePlanningWriteSync } from './planning-write.js';
import type { Session } from './session-chain.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface ExportResult {
  success: true;
  format: string;
  content: string;
  outputPath: string;
}

export interface FileExportResult {
  success: true;
  path: string;
  format: string;
}

export interface SessionManagerLike {
  loadSession(sessionId: string): Session | null;
}

// ─── SessionExport Class ────────────────────────────────────────────────────

/**
 * SessionExport provides session export functionality in multiple formats
 */
export class SessionExport {
  private sessionManager: SessionManagerLike;

  /**
   * Create a SessionExport instance
   * @param sessionManager - SessionManager instance
   */
  constructor(sessionManager: SessionManagerLike) {
    this.sessionManager = sessionManager;
  }

  /**
   * Export a session in the specified format
   * @param sessionId - Session ID
   * @param format - Export format ('markdown' or 'json')
   * @returns Export result with content and path
   */
  export(sessionId: string, format: 'markdown' | 'json' = 'markdown'): ExportResult {
    const session = this.sessionManager.loadSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    let content: string;
    switch (format) {
      case 'markdown':
        content = this.toMarkdown(session);
        break;
      case 'json':
        content = this.toJSON(session);
        break;
      default:
        throw new SessionExportError(format, 'Unsupported format');
    }

    const ext = format === 'markdown' ? 'md' : 'json';
    const outputPath = `.planning/sessions/export-${sessionId}.${ext}`;

    return {
      success: true,
      format,
      content,
      outputPath
    };
  }

  /**
   * Convert session to markdown format
   * @param session - Session object
   * @returns Markdown string
   */
  toMarkdown(session: Session): string {
    const { metadata, context, state } = session;
    const exportedAt = new Date().toISOString();

    // Calculate duration
    let duration = 'N/A';
    if (metadata.started_at && metadata.ended_at) {
      const start = new Date(metadata.started_at);
      const end = new Date(metadata.ended_at);
      const diffMs = end.getTime() - start.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (diffHrs > 0) {
        duration = `${diffHrs}h ${diffMins}m`;
      } else {
        duration = `${diffMins}m`;
      }
    }

    // Build markdown
    let md = `# Session Export: ${metadata.session_id}\n\n`;
    md += `**Exported:** ${exportedAt}\n`;
    md += `**Model:** ${metadata.model || 'Unknown'}\n`;
    md += `**Phase:** ${metadata.phase || 'N/A'}\n`;
    md += `**Plan:** ${metadata.plan || 'N/A'}\n`;
    md += `**Duration:** ${duration}\n\n`;
    md += `---\n\n`;

    // Session Summary
    md += `## Session Summary\n\n`;
    md += `**Objective:** ${state.next_recommended_action || 'Not specified'}\n\n`;

    md += `**Completed:**\n`;
    if (context.tasks && context.tasks.length > 0) {
      const completedTasks = context.tasks.filter(t => t.status === 'completed');
      if (completedTasks.length > 0) {
        completedTasks.forEach(t => md += `- ${t.name || t.description || 'Task'}\n`);
      } else {
        md += `- None\n`;
      }
    } else {
      md += `- None\n`;
    }
    md += `\n`;

    md += `**Incomplete:**\n`;
    if (state.incomplete_tasks && state.incomplete_tasks.length > 0) {
      state.incomplete_tasks.forEach(t => md += `- ${t}\n`);
    } else {
      md += `- None\n`;
    }
    md += `\n`;

    md += `---\n\n`;

    // Key Decisions
    md += `## Key Decisions\n\n`;
    if (context.decisions && context.decisions.length > 0) {
      context.decisions.forEach((decision, index) => {
        md += `${index + 1}. **${decision.title || 'Decision'}**\n`;
        if (decision.rationale) {
          md += `   - Rationale: ${decision.rationale}\n`;
        }
        if (decision.status) {
          md += `   - Status: ${decision.status}\n`;
        }
      });
    } else {
      md += `No decisions recorded\n`;
    }
    md += `\n`;

    md += `---\n\n`;

    // File Changes
    md += `## File Changes\n\n`;
    if (context.file_changes && context.file_changes.length > 0) {
      md += `| File | Action | Reason |\n`;
      md += `|------|--------|--------|\n`;
      context.file_changes.forEach(change => {
        md += `| ${change.file || 'Unknown'} | ${change.action || 'modified'} | ${change.reason || '-'} |\n`;
      });
    } else {
      md += `No file changes recorded\n`;
    }
    md += `\n`;

    md += `---\n\n`;

    // Open Questions
    md += `## Open Questions\n\n`;
    if (context.open_questions && context.open_questions.length > 0) {
      context.open_questions.forEach(q => md += `- ${q}\n`);
    } else {
      md += `None\n`;
    }
    md += `\n`;

    md += `---\n\n`;

    // Blockers
    md += `## Blockers/Concerns\n\n`;
    if (context.blockers && context.blockers.length > 0) {
      context.blockers.forEach(b => md += `- ${b}\n`);
    } else {
      md += `None\n`;
    }
    md += `\n`;

    md += `---\n\n`;

    // Recommended Next Actions
    md += `## Recommended Next Actions\n\n`;
    if (state.next_recommended_action) {
      md += `- ${state.next_recommended_action}\n`;
    } else {
      md += `None\n`;
    }
    md += `\n`;

    md += `---\n\n`;

    // Session Chain
    md += `## Session Chain\n\n`;
    const chain = metadata.session_chain || [];
    const currentIndex = chain.indexOf(metadata.session_id);

    if (chain.length > 0) {
      md += `- Previous: ${currentIndex > 0 ? chain[currentIndex - 1] : 'none'}\n`;
      md += `- Current: ${metadata.session_id}\n`;
      md += `- Next: ${currentIndex < chain.length - 1 ? chain[currentIndex + 1] : 'none'}\n`;
    } else {
      md += `- Previous: none\n`;
      md += `- Current: ${metadata.session_id}\n`;
      md += `- Next: none\n`;
    }
    md += `\n`;

    // Token Usage (if available)
    if (metadata.token_usage && (metadata.token_usage.input || metadata.token_usage.output)) {
      md += `---\n\n`;
      md += `## Token Usage\n\n`;
      md += `- Input: ${metadata.token_usage.input || 0}\n`;
      md += `- Output: ${metadata.token_usage.output || 0}\n`;
      md += `- Total: ${metadata.token_usage.total || 0}\n`;
      md += `\n`;
    }

    return md;
  }

  /**
   * Convert session to JSON format
   * @param session - Session object
   * @returns JSON string
   */
  toJSON(session: Session): string {
    const exportData = {
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      export_format: 'json',
      session: session
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export session to file
   * @param sessionId - Session ID
   * @param format - Export format
   * @param outputPath - Output file path
   * @returns Export result with path
   */
  exportToFile(sessionId: string, format: 'markdown' | 'json', outputPath?: string): FileExportResult {
    const result = this.export(sessionId, format);

    if (!outputPath) {
      outputPath = result.outputPath;
    }

    safePlanningWriteSync(outputPath, result.content);

    return {
      success: true,
      path: outputPath,
      format
    };
  }
}
