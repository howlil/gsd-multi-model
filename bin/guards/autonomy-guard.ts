/**
 * EDGE-04: Autonomy Guard
 *
 * Detects irreversible operations requiring human approval.
 * Prevents unbounded autonomy for sensitive operations.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────

interface IrreversibleCheckResult {
  irreversible: boolean;
  requiresApproval: boolean;
  reason: string;
  category: string;
}

interface ApprovalRequest {
  timestamp: string;
  operation: string;
  reason: string;
  status: 'pending';
  category: string;
}

interface FlagOperationResult {
  success: boolean;
  file?: string;
  error?: string;
  request: ApprovalRequest;
}

interface FlaggedOperation {
  operation: string;
  irreversible: boolean;
  requiresApproval: boolean;
  reason: string;
  category: string;
}

interface AutonomyCheckResult {
  requiresApproval: boolean;
  flaggedOperations: FlaggedOperation[];
  safeOperations: FlaggedOperation[];
  approvalFiles: string[];
  recommendation: string;
}

// Operations that require human approval
const IRREVERSIBLE_OPERATIONS: readonly string[] = [
  // Database operations
  'drop database',
  'drop table',
  'truncate',
  'delete all',
  'delete from',
  'drop column',
  'drop index',
  'schema migration',
  'data migration',

  // File operations
  'rm -rf',
  'del /f',
  'delete directory',
  'remove directory',
  'format',

  // Deployment operations
  'production deploy',
  'deploy to production',
  'release to production',
  'push to production',

  // Security operations
  'delete user',
  'revoke access',
  'reset credentials',
  'delete api key',
  'rotate secrets',

  // Infrastructure
  'terminate instance',
  'delete cluster',
  'destroy environment',
  'scale down to zero'
];

// Operations that are generally safe
const SAFE_OPERATIONS: readonly string[] = [
  'read',
  'list',
  'get',
  'fetch',
  'query',
  'select',
  'create',
  'insert',
  'update',
  'build',
  'compile',
  'test',
  'lint',
  'format'
];

/**
 * Check if an operation is irreversible
 * @param operation - Operation description
 * @returns Check result
 */
export function checkIrreversibleOps(operation: string): IrreversibleCheckResult {
  const lowerOp = operation.toLowerCase();

  for (const irreversible of IRREVERSIBLE_OPERATIONS) {
    if (lowerOp.includes(irreversible)) {
      return {
        irreversible: true,
        requiresApproval: true,
        reason: `Operation contains irreversible action: "${irreversible}"`,
        category: categorizeOperation(irreversible)
      };
    }
  }

  // Check for safe operations
  for (const safe of SAFE_OPERATIONS) {
    if (lowerOp.includes(safe)) {
      return {
        irreversible: false,
        requiresApproval: false,
        reason: `Operation is reversible: "${safe}"`,
        category: 'safe'
      };
    }
  }

  // Unknown operation - flag for review
  return {
    irreversible: false,
    requiresApproval: false,
    reason: 'Operation not classified - assuming safe',
    category: 'unknown'
  };
}

/**
 * Categorize an operation
 * @param operation - Operation description
 * @returns Category name
 */
export function categorizeOperation(operation: string): string {
  const lowerOp = operation.toLowerCase();

  if (lowerOp.includes('database') || lowerOp.includes('table') || lowerOp.includes('schema')) {
    return 'database';
  }
  if (lowerOp.includes('file') || lowerOp.includes('directory') || lowerOp.includes('rm ') || lowerOp.includes('del ')) {
    return 'filesystem';
  }
  if (lowerOp.includes('deploy') || lowerOp.includes('production') || lowerOp.includes('release')) {
    return 'deployment';
  }
  if (lowerOp.includes('user') || lowerOp.includes('access') || lowerOp.includes('credential') || lowerOp.includes('secret')) {
    return 'security';
  }
  if (lowerOp.includes('instance') || lowerOp.includes('cluster') || lowerOp.includes('environment')) {
    return 'infrastructure';
  }

  return 'general';
}

/**
 * Check if operation requires human approval
 * @param operation - Operation description
 * @returns True if approval required
 */
export function requiresHumanApproval(operation: string): boolean {
  const result = checkIrreversibleOps(operation);
  return result.requiresApproval;
}

/**
 * Flag an operation for approval
 * @param operation - Operation description
 * @param reason - Reason for flagging
 * @param approvalFile - Path to write approval request
 * @returns Approval request result
 */
export function flagOperation(operation: string, reason: string, approvalFile: string): FlagOperationResult {
  const approvalRequest: ApprovalRequest = {
    timestamp: new Date().toISOString(),
    operation,
    reason,
    status: 'pending',
    category: categorizeOperation(operation)
  };

  try {
    // Ensure directory exists
    const dir = path.dirname(approvalFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write approval request
    fs.writeFileSync(
      approvalFile,
      `# Approval Request

**Created:** ${approvalRequest.timestamp}
**Category:** ${approvalRequest.category}
**Status:** ${approvalRequest.status}

## Operation

\`\`\`
${operation}
\`\`\`

## Reason for Approval

${reason}

## Approval

- [ ] Approved by: _______________
- [ ] Date: _______________
- [ ] Comments: _______________
`
    );

    return {
      success: true,
      file: approvalFile,
      request: approvalRequest
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
      request: approvalRequest
    };
  }
}

/**
 * Extract operations from text
 * @param text - Text to analyze
 * @returns Array of operations
 */
export function extractOperations(text: string): string[] {
  const operationPatterns = [
    /(?:will|would|should|must|need to)\s+(?:then\s+)?([A-Z][^.!?]*(?:database|table|file|directory|deploy|production|user)[^.!?]*)/gi,
    /(?:step \d+[:\s]+)([A-Z][^.!?]+)/gi,
    /(?:command|operation)[:\s]+([A-Z][^.!?]+)/gi
  ];

  const operations = new Set<string>();

  for (const pattern of operationPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const op = (match[1] || '').trim();
      if (op.length > 10 && op.length < 200) {
        operations.add(op);
      }
    }
  }

  return Array.from(operations);
}

/**
 * Full autonomy check
 * @param output - AI generated output describing operations
 * @param phaseDir - Phase directory
 * @returns Complete autonomy check result
 */
export function checkAutonomy(output: string, phaseDir: string): AutonomyCheckResult {
  const operations = extractOperations(output);
  const flaggedOperations: FlaggedOperation[] = [];
  const safeOperations: FlaggedOperation[] = [];

  for (const op of operations) {
    const result = checkIrreversibleOps(op);
    if (result.requiresApproval) {
      flaggedOperations.push({
        operation: op,
        ...result
      });
    } else {
      safeOperations.push({
        operation: op,
        ...result
      });
    }
  }

  // Flag operations if any need approval
  const approvalFiles: string[] = [];
  if (flaggedOperations.length > 0 && phaseDir) {
    const approvalsDir = path.join(phaseDir, '.planning', 'approvals');
    for (let i = 0; i < flaggedOperations.length; i++) {
      const flag = flaggedOperations[i]!;
      const approvalFile = path.join(approvalsDir, `approval-${Date.now()}-${i}.md`);
      const result = flagOperation(flag.operation, flag.reason, approvalFile);
      if (result.success && result.file) {
        approvalFiles.push(result.file);
      }
    }
  }

  return {
    requiresApproval: flaggedOperations.length > 0,
    flaggedOperations,
    safeOperations,
    approvalFiles,
    recommendation: flaggedOperations.length > 0
      ? `Human approval required for ${flaggedOperations.length} operation(s). Check .planning/approvals/`
      : 'All operations are safe to execute autonomously'
  };
}

// ─────────────────────────────────────────────
// CLI Interface
// ─────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'check' && args[1]) {
    const operation = args.slice(1).join(' ');
    console.log(`Checking operation: "${operation}"`);

    const result = checkIrreversibleOps(operation);

    if (result.requiresApproval) {
      console.log('⚠️  Requires human approval');
      console.log(`   Category: ${result.category}`);
      console.log(`   Reason: ${result.reason}`);
      process.exit(1);
    } else {
      console.log('✅ Safe to execute autonomously');
      console.log(`   Category: ${result.category}`);
      console.log(`   Reason: ${result.reason}`);
      process.exit(0);
    }

  } else if (command === 'flag' && args[1]) {
    const operation = args[2] || args[1];
    const reason = args[3] || 'Flagged for review';
    const approvalFile = args[4] || `.planning/approvals/approval-${Date.now()}.md`;

    const result = flagOperation(operation, reason, approvalFile);

    if (result.success) {
      console.log(`✅ Approval request created: ${result.file}`);
      process.exit(0);
    } else {
      console.log(`❌ Failed to create approval request: ${result.error}`);
      process.exit(1);
    }

  } else {
    console.log('Usage: node autonomy-guard.ts <command> [args]');
    console.log('Commands:');
    console.log('  check <operation>              - Check if operation requires approval');
    console.log('  flag <operation> [reason]      - Create approval request');
    process.exit(1);
  }
}
