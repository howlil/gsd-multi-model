/**
 * Quality Gate Coordinator
 *
 * Central registry and execution engine for quality gates.
 * Supports gate registration, execution, bypass with audit trail, and status reporting.
 * Uses Zod for schema validation of gate inputs/outputs.
 *
 * @module quality-gate
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

/**
 * Get the audit trail file path (computed at runtime to support cwd changes)
 */
function getAuditFilePath(): string {
  return path.join(process.cwd(), '.planning', 'gate-audit.json');
}

/**
 * Gate definition interface
 */
export interface GateDefinition {
  /** Gate identifier */
  id: string;
  /** Zod schema for context validation */
  schema: z.ZodSchema;
  /** Gate execution function */
  executor: (context: any) => Promise<GateExecutorResult>;
}

/**
 * Gate status interface
 */
export interface GateStatus {
  /** Current gate state */
  state: 'registered' | 'passed' | 'failed' | 'bypassed';
  /** Gate identifier */
  id?: string;
  /** Registration timestamp */
  registeredAt?: Date;
  /** Execution timestamp */
  executedAt?: Date;
  /** Bypass timestamp */
  bypassedAt?: Date;
  /** Reason for bypass */
  bypassReason?: string;
  /** Errors from last execution */
  errors?: Array<{ path: string; message: string }>;
  /** Warnings from last execution */
  warnings?: string[];
}

/**
 * Gate execution result interface
 */
export interface GateExecutorResult {
  /** Whether the gate passed */
  passed: boolean;
  /** Validation or execution errors */
  errors?: Array<{ path: string; message: string }>;
  /** Warnings */
  warnings?: string[];
}

/**
 * Audit trail entry interface
 */
export interface AuditEntry {
  /** Gate identifier */
  gateId: string;
  /** Action type */
  action: 'bypass';
  /** Reason for bypass */
  reason: string;
  /** ISO timestamp */
  timestamp: string;
}

/**
 * Quality Gate class - stateful coordinator for gate registration and execution
 */
export class QualityGate {
  #gates: Map<string, GateDefinition>;
  #status: Map<string, GateStatus>;
  #auditTrail: AuditEntry[];

  constructor() {
    this.#gates = new Map();
    this.#status = new Map();
    this.#auditTrail = this.#loadAuditTrail();
  }

  /**
   * Load audit trail from file
   */
  #loadAuditTrail(): AuditEntry[] {
    const auditFilePath = getAuditFilePath();
    try {
      if (fs.existsSync(auditFilePath)) {
        const content = fs.readFileSync(auditFilePath, 'utf-8');
        return JSON.parse(content) as AuditEntry[];
      }
    } catch (err) {
      // If file is corrupted or unreadable, start fresh
      console.warn('Warning: Could not load gate audit trail, starting fresh');
    }
    return [];
  }

  /**
   * Save audit trail to file
   */
  #saveAuditTrail(): void {
    const auditFilePath = getAuditFilePath();
    try {
      const dir = path.dirname(auditFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(auditFilePath, JSON.stringify(this.#auditTrail, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving gate audit trail:', (err as Error).message);
    }
  }

  /**
   * Format Zod validation errors into structured array with field paths
   * @param zodError - Zod error to format
   */
  #formatValidationErrors(zodError: z.ZodError): Array<{ path: string; message: string }> {
    const errors: Array<{ path: string; message: string }> = [];
    for (const issue of zodError.errors) {
      const fieldPath = issue.path.join('.');
      errors.push({
        path: fieldPath || 'root',
        message: issue.message,
      });
    }
    return errors;
  }

  /**
   * Register a quality gate
   * @param id - Unique gate identifier
   * @param schema - Zod schema for context validation
   * @param executor - Async function that executes the gate logic
   */
  registerGate(id: string, schema: z.ZodSchema, executor: (context: any) => Promise<GateExecutorResult>): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Gate ID must be a non-empty string');
    }

    if (!schema || !schema.safeParse) {
      throw new Error('Schema must be a valid Zod schema');
    }

    if (typeof executor !== 'function') {
      throw new Error('Executor must be a function');
    }

    this.#gates.set(id, { id, schema, executor });
    this.#status.set(id, {
      state: 'registered',
      id,
      registeredAt: new Date(),
    });
  }

  /**
   * Execute a quality gate
   * @param id - Gate identifier
   * @param context - Context data to validate and pass to executor
   * @returns Execution result
   */
  async executeGate(id: string, context: any): Promise<GateExecutorResult> {
    const gate = this.#gates.get(id);

    if (!gate) {
      throw new Error(`Gate not registered: ${id}`);
    }

    // Validate context against schema
    const parseResult = gate.schema.safeParse(context);

    if (!parseResult.success) {
      const errors = this.#formatValidationErrors(parseResult.error);
      const status: GateStatus = {
        ...this.#status.get(id)!,
        state: 'failed',
        executedAt: new Date(),
        errors,
      };
      this.#status.set(id, status);
      return { passed: false, errors, warnings: [] };
    }

    // Run executor with validated context
    try {
      const result = await gate.executor(parseResult.data);

      // Handle executor result
      if (result.passed) {
        const status: GateStatus = {
          ...this.#status.get(id)!,
          state: 'passed',
          executedAt: new Date(),
          errors: [],
          warnings: result.warnings || [],
        };
        this.#status.set(id, status);
        return { passed: true, errors: [], warnings: result.warnings || [] };
      } else {
        const errors = result.errors || [{ path: 'executor', message: 'Gate execution failed' }];
        const status: GateStatus = {
          ...this.#status.get(id)!,
          state: 'failed',
          executedAt: new Date(),
          errors,
          warnings: result.warnings || [],
        };
        this.#status.set(id, status);
        return { passed: false, errors, warnings: result.warnings || [] };
      }
    } catch (err) {
      const errors = [{ path: 'executor', message: (err as Error).message || 'Executor throws an exception' }];
      const status: GateStatus = {
        ...this.#status.get(id)!,
        state: 'failed',
        executedAt: new Date(),
        errors,
      };
      this.#status.set(id, status);
      return { passed: false, errors, warnings: [] };
    }
  }

  /**
   * Bypass a quality gate with mandatory audit reason
   * @param id - Gate identifier
   * @param reason - Reason for bypass (cannot be empty)
   */
  bypassGate(id: string, reason: string): void {
    const gate = this.#gates.get(id);

    if (!gate) {
      throw new Error(`Gate not registered: ${id}`);
    }

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      throw new Error('Bypass reason must be a non-empty string');
    }

    const status: GateStatus = {
      ...this.#status.get(id)!,
      state: 'bypassed',
      bypassedAt: new Date(),
      bypassReason: reason.trim(),
    };
    this.#status.set(id, status);

    // Log to audit trail
    const auditEntry: AuditEntry = {
      gateId: id,
      action: 'bypass',
      reason: reason.trim(),
      timestamp: new Date().toISOString(),
    };
    this.#auditTrail.push(auditEntry);
    this.#saveAuditTrail();
  }

  /**
   * Get the current status of a gate
   * @param id - Gate identifier
   * @returns Gate status
   */
  getGateStatus(id: string): GateStatus {
    const status = this.#status.get(id);

    if (!status) {
      throw new Error(`Gate not registered: ${id}`);
    }

    return { ...status };
  }

  /**
   * Get all registered gate IDs
   * @returns Array of gate IDs
   */
  getRegisteredGates(): string[] {
    return Array.from(this.#gates.keys());
  }

  /**
   * Get the audit trail
   * @returns Array of audit entries
   */
  getAuditTrail(): AuditEntry[] {
    return [...this.#auditTrail];
  }

  /**
   * Check if a gate is registered
   * @param id - Gate identifier
   * @returns True if gate is registered
   */
  isRegistered(id: string): boolean {
    return this.#gates.has(id);
  }

  /**
   * Reset gate status (for testing)
   * @param id - Gate identifier
   */
  resetGate(id: string): void {
    const gate = this.#gates.get(id);
    if (gate) {
      this.#status.set(id, {
        state: 'registered',
        id,
        registeredAt: new Date(),
      });
    }
  }

  /**
   * Clear all gates and audit trail (for testing)
   */
  clear(): void {
    this.#gates.clear();
    this.#status.clear();
    this.#auditTrail = [];
    // Also clear the audit file
    const auditFilePath = getAuditFilePath();
    if (fs.existsSync(auditFilePath)) {
      fs.writeFileSync(auditFilePath, '[]', 'utf-8');
    }
  }
}
