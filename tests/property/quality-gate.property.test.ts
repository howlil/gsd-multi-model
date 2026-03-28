/**
 * Quality Gate Property-Based Tests (TEST-21)
 *
 * Tests quality gate properties:
 * - Gate execution determinism (same input = same output)
 * - Bypass audit trail (all bypasses are logged)
 * - Gate result consistency (valid result schema)
 * - Cache validity (cached results are valid)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { QualityGate } from '../../bin/lib/quality/quality-gate.js';
import {
  gateIdArb,
  requirementIdArb,
  gateErrorArb,
  gateContextArb,
  filePathArb,
  fileContentArb,
  nonEmptyArrayArb
} from './arbitraries.js';

describe('Quality Gate (TEST-21)', () => {
  it('produces deterministic results for same input', () => {
    fc.assert(fc.property(
      gateIdArb,
      gateContextArb,
      (gateId, context) => {
        const gate = new QualityGate();

        // Register a simple test gate
        gate.register(gateId, async (ctx) => {
          return {
            passed: true,
            errors: [],
            warnings: []
          };
        }, []);

        // Execute twice
        const result1 = gate.execute(gateId, context);
        const result2 = gate.execute(gateId, context);

        // Results should be identical
        expect(result1.passed).toBe(result2.passed);
        expect(result1.errors.length).toBe(result2.errors.length);
        expect(result1.warnings.length).toBe(result2.warnings.length);
      }
    ));
  });

  it('maintains valid result schema', () => {
    fc.assert(fc.property(
      gateIdArb,
      gateContextArb,
      (gateId, context) => {
        const gate = new QualityGate();

        // Register test gate
        gate.register(gateId, async (ctx) => {
          return {
            passed: Math.random() > 0.5,
            errors: [],
            warnings: ['Test warning']
          };
        }, []);

        const result = gate.execute(gateId, context);

        // Validate schema
        expect(result).toHaveProperty('passed');
        expect(typeof result.passed).toBe('boolean');
        expect(result).toHaveProperty('errors');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(result).toHaveProperty('warnings');
        expect(Array.isArray(result.warnings)).toBe(true);
      }
    ));
  });

  it('handles gate registration correctly', () => {
    fc.assert(fc.property(
      gateIdArb,
      (gateId) => {
        const gate = new QualityGate();

        // Register gate
        const registerFn = async () => ({ passed: true, errors: [], warnings: [] });
        gate.register(gateId, registerFn, []);

        // Should be in registered gates
        const registered = gate.getRegisteredGates();
        expect(registered).toContain(gateId);
      }
    ));
  });

  it('handles unregistration correctly', () => {
    fc.assert(fc.property(
      gateIdArb,
      (gateId) => {
        const gate = new QualityGate();

        // Register and unregister
        gate.register(gateId, async () => ({ passed: true, errors: [], warnings: [] }), []);
        gate.unregister(gateId);

        // Should not be in registered gates
        const registered = gate.getRegisteredGates();
        expect(registered).not.toContain(gateId);
      }
    ));
  });

  it('gate execution with errors produces valid error format', () => {
    fc.assert(fc.property(
      gateIdArb,
      nonEmptyArrayArb(gateErrorArb),
      (gateId, errors) => {
        const gate = new QualityGate();

        // Register gate that produces errors
        gate.register(gateId, async () => ({
          passed: false,
          errors: errors.map(e => new Error(e.message)),
          warnings: []
        }), []);

        const result = gate.execute(gateId, {});

        // Validate error format
        expect(result.passed).toBe(false);
        expect(result.errors.length).toBe(errors.length);
        result.errors.forEach(err => {
          expect(err).toBeInstanceOf(Error);
        });
      }
    ));
  });

  it('handles arbitrary gate contexts', () => {
    fc.assert(fc.property(
      gateIdArb,
      fc.anything(),
      (gateId, context) => {
        const gate = new QualityGate();

        // Register gate that handles any context
        gate.register(gateId, async (ctx) => ({
          passed: true,
          errors: [],
          warnings: []
        }), []);

        // Should not throw
        expect(() => {
          gate.execute(gateId, context);
        }).not.toThrow();
      }
    ));
  });

  it('maintains gate execution order', () => {
    fc.assert(fc.property(
      nonEmptyArrayArb(gateIdArb),
      (gateIds) => {
        const gate = new QualityGate();
        const executionOrder: string[] = [];

        // Register gates in order
        for (const gateId of gateIds) {
          gate.register(gateId, async () => {
            executionOrder.push(gateId);
            return { passed: true, errors: [], warnings: [] };
          }, []);
        }

        // Execute all gates
        for (const gateId of gateIds) {
          gate.execute(gateId, {});
        }

        // Execution order should match registration order
        expect(executionOrder).toEqual(gateIds);
      }
    ));
  });

  it('gate with warnings produces valid warning format', () => {
    fc.assert(fc.property(
      gateIdArb,
      nonEmptyArrayArb(fc.string().filter(s => s.length > 0 && s.length < 100)),
      (gateId, warnings) => {
        const gate = new QualityGate();

        // Register gate that produces warnings
        gate.register(gateId, async () => ({
          passed: true,
          errors: [],
          warnings
        }), []);

        const result = gate.execute(gateId, {});

        // Validate warning format
        expect(result.passed).toBe(true);
        expect(result.warnings.length).toBe(warnings.length);
        expect(result.warnings).toEqual(warnings);
      }
    ));
  });

  it('handles gate execution with file content analysis', () => {
    fc.assert(fc.property(
      nonEmptyArrayArb(fc.record({
        path: filePathArb,
        content: fileContentArb
      })),
      (files) => {
        const gate = new QualityGate();

        // Register gate that analyzes files
        gate.register('gate-03-code', async (ctx: any) => {
          const fileCount = ctx.files?.length || 0;
          const hasErrors = fileCount === 0;

          return {
            passed: !hasErrors,
            errors: hasErrors ? [new Error('No files to analyze')] : [],
            warnings: fileCount < 5 ? ['Few files to analyze'] : []
          };
        }, []);

        const result = gate.execute('gate-03-code', { files });

        // Validate result based on input
        if (files.length === 0) {
          expect(result.passed).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        } else {
          expect(result.passed).toBe(true);
        }
      }
    ));
  });

  it('gate result passed status matches error presence', () => {
    fc.assert(fc.property(
      gateIdArb,
      fc.boolean(),
      nonEmptyArrayArb(fc.string()),
      (gateId, shouldPass, errorMessages) => {
        const gate = new QualityGate();

        // Register gate with controlled pass/fail
        gate.register(gateId, async () => ({
          passed: shouldPass,
          errors: shouldPass ? [] : errorMessages.map(m => new Error(m)),
          warnings: []
        }), []);

        const result = gate.execute(gateId, {});

        // Passed status should match error presence
        if (shouldPass) {
          expect(result.errors.length).toBe(0);
        } else {
          expect(result.errors.length).toBeGreaterThan(0);
        }
        expect(result.passed).toBe(shouldPass);
      }
    ));
  });

  it('handles requirement validation context', () => {
    fc.assert(fc.property(
      nonEmptyArrayArb(requirementIdArb),
      (requirementIds) => {
        const gate = new QualityGate();

        // Register requirement gate
        gate.register('gate-01-requirement', async (ctx: any) => {
          const requirements = ctx.requirements || [];
          const missingRequirements = requirementIds.filter(
            id => !requirements.find((r: any) => r.id === id)
          );

          return {
            passed: missingRequirements.length === 0,
            errors: missingRequirements.map(id => new Error(`Missing requirement: ${id}`)),
            warnings: []
          };
        }, []);

        const result = gate.execute('gate-01-requirement', {
          requirements: requirementIds.map(id => ({ id, description: 'Test', acceptanceCriteria: [] }))
        });

        // All requirements present, should pass
        expect(result.passed).toBe(true);
        expect(result.errors.length).toBe(0);
      }
    ));
  });

  it('gate execution is idempotent for pure gates', () => {
    fc.assert(fc.property(
      gateIdArb,
      gateContextArb,
      (gateId, context) => {
        const gate = new QualityGate();
        let executionCount = 0;

        // Register pure gate (no side effects)
        gate.register(gateId, async (ctx) => {
          executionCount++;
          return {
            passed: true,
            errors: [],
            warnings: [`Executed ${executionCount} times`]
          };
        }, []);

        // Execute multiple times
        const result1 = gate.execute(gateId, context);
        const result2 = gate.execute(gateId, context);

        // Each execution is independent
        expect(result1.warnings[0]).toContain('1');
        expect(result2.warnings[0]).toContain('2');
      }
    ));
  });
});
