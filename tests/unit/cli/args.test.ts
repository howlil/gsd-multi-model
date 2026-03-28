/**
 * Tests for CLI Argument Parser
 */

import { describe, it, expect } from 'vitest';
import {
  parseWorkflowArgs,
  extractPhaseNumber,
  extractFlags,
  normalizePhase,
  validateArgs,
  formatArgHelp,
  type ArgSchema,
} from '../args.js';

describe('parseWorkflowArgs', () => {
  const schema: ArgSchema = {
    phase: { type: 'number', description: 'Phase number', alias: 'p' },
    auto: { type: 'boolean', description: 'Skip checkpoints' },
    full: { type: 'boolean', description: 'Enable verification' },
    description: { type: 'string', description: 'Task description' },
  };

  it('parses positional phase number', () => {
    const result = parseWorkflowArgs('1 --auto fix auth bug', schema);
    
    expect(result.errors).toHaveLength(0);
    expect(result.flags.auto).toBe(true);
    expect(result.positional).toContain('1');
    expect(result.remainder).toBe('fix auth bug');
  });

  it('parses --phase=N format', () => {
    const result = parseWorkflowArgs('--phase=3 --full test description', schema);
    
    expect(result.errors).toHaveLength(0);
    expect(result.flags.phase).toBe(3);
    expect(result.flags.full).toBe(true);
    expect(result.remainder).toBe('test description');
  });

  it('parses -p N format', () => {
    const result = parseWorkflowArgs('-p 5 --auto task', schema);
    
    expect(result.errors).toHaveLength(0);
    expect(result.flags.phase).toBe(5);
    expect(result.flags.auto).toBe(true);
  });

  it('handles multiple boolean flags', () => {
    const result = parseWorkflowArgs('--auto --full', schema);
    
    expect(result.errors).toHaveLength(0);
    expect(result.flags.auto).toBe(true);
    expect(result.flags.full).toBe(true);
  });

  it('handles empty arguments', () => {
    const result = parseWorkflowArgs('', schema);
    
    expect(result.positional).toHaveLength(0);
    expect(result.remainder).toBe('');
  });

  it('handles quoted strings', () => {
    const result = parseWorkflowArgs('1 --auto "fix critical bug"', schema);
    
    expect(result.errors).toHaveLength(0);
    expect(result.remainder).toBe('fix critical bug');
  });

  it('detects unknown flags', () => {
    const result = parseWorkflowArgs('--unknown-flag', schema);
    
    expect(result.errors).some(e => e.includes('Unknown flag'));
  });

  it('validates required arguments', () => {
    const requiredSchema: ArgSchema = {
      phase: { type: 'number', required: true },
    };
    
    const result = parseWorkflowArgs('', requiredSchema);
    
    expect(result.errors).some(e => e.includes('Missing required'));
  });

  it('applies default values', () => {
    const schemaWithDefaults: ArgSchema = {
      auto: { type: 'boolean', default: false },
      full: { type: 'boolean', default: true },
    };
    
    const result = parseWorkflowArgs('', schemaWithDefaults);
    
    expect(result.flags.auto).toBe(false);
    expect(result.flags.full).toBe(true);
  });

  it('validates choices', () => {
    const schemaWithChoices: ArgSchema = {
      profile: { 
        type: 'string', 
        choices: ['quality', 'balanced', 'budget'] 
      },
    };
    
    const result = parseWorkflowArgs('--profile=invalid', schemaWithChoices);
    
    expect(result.errors).some(e => e.includes('Invalid value'));
  });
});

describe('extractPhaseNumber', () => {
  it('extracts positional phase number', () => {
    expect(extractPhaseNumber('1 --auto')).toBe(1);
    expect(extractPhaseNumber('12 --full test')).toBe(12);
  });

  it('extracts --phase=N format', () => {
    expect(extractPhaseNumber('--phase=3')).toBe(3);
    expect(extractPhaseNumber('--phase=6.1')).toBe(6.1);
  });

  it('extracts -p N format', () => {
    expect(extractPhaseNumber('-p 5')).toBe(5);
    expect(extractPhaseNumber('-p 12A')).toBe(12);
  });

  it('returns null for no phase', () => {
    expect(extractPhaseNumber('fix bug')).toBeNull();
    expect(extractPhaseNumber('--auto')).toBeNull();
  });

  it('handles decimal phases', () => {
    expect(extractPhaseNumber('6.1')).toBe(6.1);
    expect(extractPhaseNumber('--phase=12.1.2')).toBe(12.102);
  });
});

describe('extractFlags', () => {
  it('extracts long flags', () => {
    const flags = extractFlags('--auto --full --discuss');
    expect(flags).toEqual(['auto', 'full', 'discuss']);
  });

  it('extracts short flags', () => {
    const flags = extractFlags('-a -f -d');
    expect(flags).toEqual(['a', 'f', 'd']);
  });

  it('extracts mixed flags', () => {
    const flags = extractFlags('--auto -f --discuss');
    expect(flags).toEqual(['auto', 'f', 'discuss']);
  });

  it('returns empty array for no flags', () => {
    const flags = extractFlags('fix bug');
    expect(flags).toEqual([]);
  });
});

describe('normalizePhase', () => {
  it('pads single digit phases', () => {
    expect(normalizePhase(1)).toBe('01');
    expect(normalizePhase('5')).toBe('05');
  });

  it('preserves double digit phases', () => {
    expect(normalizePhase(12)).toBe('12');
    expect(normalizePhase('15')).toBe('15');
  });

  it('normalizes decimal phases', () => {
    expect(normalizePhase('6.1')).toBe('06.1');
    expect(normalizePhase('12.1.2')).toBe('12.1.2');
  });

  it('handles letter phases', () => {
    expect(normalizePhase('12A')).toBe('12A');
    expect(normalizePhase('12b')).toBe('12B');
  });

  it('handles complex phases', () => {
    expect(normalizePhase('12A.1.2')).toBe('12A.1.2');
    expect(normalizePhase('6B.3')).toBe('06B.3');
  });
});

describe('validateArgs', () => {
  it('validates required arguments', () => {
    const schema: ArgSchema = {
      phase: { type: 'number', required: true },
    };
    
    const parsed = parseWorkflowArgs('', schema);
    const validation = validateArgs(parsed, schema);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors).some(e => e.includes('phase'));
  });

  it('passes when required arguments present', () => {
    const schema: ArgSchema = {
      phase: { type: 'number', required: true },
    };
    
    const parsed = parseWorkflowArgs('--phase=1', schema);
    const validation = validateArgs(parsed, schema);
    
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('accumulates errors', () => {
    const schema: ArgSchema = {
      phase: { type: 'number', required: true },
      description: { type: 'string', required: true },
    };
    
    const parsed = parseWorkflowArgs('', schema);
    const validation = validateArgs(parsed, schema);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThanOrEqual(1);
  });
});

describe('formatArgHelp', () => {
  it('formats help message', () => {
    const schema: ArgSchema = {
      phase: { 
        type: 'number', 
        description: 'Phase number',
        alias: 'p',
        required: true
      },
      auto: { 
        type: 'boolean', 
        description: 'Skip checkpoints',
        default: false
      },
    };
    
    const help = formatArgHelp(schema, 'Test command');
    
    expect(help).toContain('Test command');
    expect(help).toContain('--phase');
    expect(help).toContain('-p');
    expect(help).toContain('--auto');
    expect(help).toContain('Phase number');
    expect(help).toContain('Skip checkpoints');
    expect(help).toContain('required');
    expect(help).toContain('default: false');
  });
});
