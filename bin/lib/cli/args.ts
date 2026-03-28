/**
 * CLI Argument Parser - Standardized argument parsing for EZ Agents workflows
 * 
 * Replaces fragile bash grep/awk with TypeScript-based parsing.
 * Cross-platform compatible (Windows, Linux, macOS).
 */

export interface ArgSchema {
  [key: string]: ArgDefinition;
}

export interface ArgDefinition {
  type: 'string' | 'number' | 'boolean' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
  alias?: string;
  choices?: string[];
}

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, unknown>;
  remainder: string;
  errors: string[];
}

/**
 * Parse command-line arguments according to a schema
 * 
 * @param args - Raw argument string (e.g., "1 --auto --full task description")
 * @param schema - Argument schema definition
 * @returns Parsed arguments with validation
 * 
 * @example
 * ```typescript
 * const schema: ArgSchema = {
 *   phase: { type: 'number', description: 'Phase number', alias: 'p' },
 *   auto: { type: 'boolean', description: 'Skip checkpoints' },
 *   full: { type: 'boolean', description: 'Enable verification' },
 *   description: { type: 'string', description: 'Task description' }
 * };
 * 
 * const parsed = parseWorkflowArgs("1 --auto --full fix auth bug", schema);
 * // {
 * //   positional: ['1', 'fix', 'auth', 'bug'],
 * //   flags: { phase: 1, auto: true, full: true },
 * //   remainder: 'fix auth bug',
 * //   errors: []
 * // }
 * ```
 */
export function parseWorkflowArgs(args: string, schema: ArgSchema): ParsedArgs {
  const result: ParsedArgs = {
    positional: [],
    flags: {},
    remainder: '',
    errors: []
  };

  if (!args || args.trim() === '') {
    // Apply defaults for all required fields
    for (const [key, def] of Object.entries(schema)) {
      if (def.required && def.default === undefined) {
        result.errors.push(`Missing required argument: ${key}`);
      } else if (def.default !== undefined) {
        result.flags[key] = def.default;
      }
    }
    return result;
  }

  // Tokenize: split on whitespace but preserve quoted strings
  const tokens = tokenizeArgs(args);
  const flagNames = new Set(Object.keys(schema));
  const aliasMap = new Map<string, string>();
  
  // Build alias reverse map
  for (const [key, def] of Object.entries(schema)) {
    if (def.alias) {
      aliasMap.set(def.alias, key);
      aliasMap.set(`-${def.alias}`, key);
      aliasMap.set(`--${def.alias}`, key);
    }
  }

  let i = 0;
  const positional: string[] = [];
  const flags: Record<string, unknown> = {};
  const flagPositions: number[] = [];

  while (i < tokens.length) {
    const token = tokens[i]!;

    if (token.startsWith('--')) {
      // Long flag: --auto, --phase=1
      flagPositions.push(i);
      const flagMatch = token.match(/^--([^=:]+)(?:=(.+))?$/);
      
      if (flagMatch) {
        const flagName = flagMatch[1]!;
        const flagValue = flagMatch[2];
        const resolvedName = aliasMap.get(flagName) || flagName;
        
        if (flagValue !== undefined) {
          // Flag with value: --phase=1
          flags[resolvedName] = parseValue(flagValue, schema[resolvedName]);
          i++;
        } else {
          // Boolean flag or flag with next value
          const flagDef = schema[resolvedName];
          if (flagDef?.type === 'boolean') {
            flags[resolvedName] = true;
            i++;
          } else if (i + 1 < tokens.length && !tokens[i + 1]!.startsWith('-')) {
            // Next token is value
            flags[resolvedName] = parseValue(tokens[i + 1]!, flagDef);
            flagPositions.push(i + 1);
            i += 2;
          } else {
            // Boolean flag without value
            flags[resolvedName] = true;
            i++;
          }
        }
      } else {
        result.errors.push(`Invalid flag format: ${token}`);
        i++;
      }
    } else if (token.startsWith('-') && token.length === 2) {
      // Short flag: -a, -p 1
      flagPositions.push(i);
      const flagName = token.slice(1);
      const resolvedName = aliasMap.get(flagName) || flagName;
      
      const flagDef = schema[resolvedName];
      if (flagDef?.type === 'boolean') {
        flags[resolvedName] = true;
        i++;
      } else if (i + 1 < tokens.length) {
        flags[resolvedName] = parseValue(tokens[i + 1]!, flagDef);
        flagPositions.push(i + 1);
        i += 2;
      } else {
        result.errors.push(`Flag -${flagName} requires a value`);
        i++;
      }
    } else {
      // Positional argument
      positional.push(token);
      i++;
    }
  }

  // Validate flags against schema
  for (const [flagName, flagValue] of Object.entries(flags)) {
    const def = schema[flagName];
    if (!def) {
      result.errors.push(`Unknown flag: ${flagName}`);
      continue;
    }

    // Validate choices
    if (def.choices && !def.choices.includes(String(flagValue))) {
      result.errors.push(`Invalid value for ${flagName}: ${flagValue}. Choices: ${def.choices.join(', ')}`);
    }
  }

  // Check required flags
  for (const [key, def] of Object.entries(schema)) {
    if (def.required && flags[key] === undefined) {
      result.errors.push(`Missing required flag: ${key}`);
    }
  }

  // Extract remainder (non-flag tokens after first flag)
  let remainderStart = 0;
  if (flagPositions.length > 0) {
    const firstFlagPos = Math.min(...flagPositions);
    remainderStart = firstFlagPos;
  }
  
  const remainderTokens = tokens.slice(remainderStart).filter((_, idx) => {
    const absoluteIdx = remainderStart + idx;
    return !flagPositions.includes(absoluteIdx) && !tokens[absoluteIdx]!.startsWith('-');
  });

  result.positional = positional;
  result.flags = flags;
  result.remainder = remainderTokens.join(' ');
  result.errors = result.errors;

  return result;
}

/**
 * Tokenize argument string, preserving quoted substrings
 */
function tokenizeArgs(args: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < args.length; i++) {
    const char = args[i]!;

    if (inQuote) {
      if (char === quoteChar) {
        inQuote = false;
        quoteChar = '';
      } else {
        current += char;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuote = true;
        quoteChar = char;
      } else if (char === ' ' || char === '\t') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parse value according to type definition
 */
function parseValue(value: string, def?: ArgDefinition): unknown {
  if (!def) {
    return value;
  }

  switch (def.type) {
    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Expected number, got: ${value}`);
      }
      return num;
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1' || value === '';
    case 'array':
      return value.split(',').map(v => v.trim());
    case 'string':
    default:
      return value;
  }
}

/**
 * Extract phase number from arguments
 * 
 * @param args - Raw argument string
 * @returns Phase number or null
 * 
 * @example
 * ```typescript
 * extractPhaseNumber("1 --auto fix bug") // returns 1
 * extractPhaseNumber("--phase=3 test") // returns 3
 * extractPhaseNumber("fix bug") // returns null
 * ```
 */
export function extractPhaseNumber(args: string): number | null {
  // Try --phase=N format
  const phaseFlagMatch = args.match(/--phase=(\d+(?:\.\d+)?[A-Z]?)/i);
  if (phaseFlagMatch) {
    return Number(phaseFlagMatch[1]);
  }

  // Try -p N format
  const shortPhaseMatch = args.match(/-p\s+(\d+(?:\.\d+)?[A-Z]?)/i);
  if (shortPhaseMatch) {
    return Number(shortPhaseMatch[1]);
  }

  // Try first positional number
  const tokens = tokenizeArgs(args);
  for (const token of tokens) {
    if (!token.startsWith('-') && /^\d+(?:\.\d+)?[A-Z]?$/i.test(token)) {
      return Number(token);
    }
  }

  return null;
}

/**
 * Extract flags from arguments
 * 
 * @param args - Raw argument string
 * @returns Array of flag names
 * 
 * @example
 * ```typescript
 * extractFlags("1 --auto --full task") // returns ['auto', 'full']
 * ```
 */
export function extractFlags(args: string): string[] {
  const flags: string[] = [];
  const flagMatches = args.match(/--?([a-zA-Z][a-zA-Z0-9_-]*)/g);
  
  if (flagMatches) {
    for (const match of flagMatches) {
      flags.push(match.replace(/^--?/, ''));
    }
  }

  return flags;
}

/**
 * Normalize phase number to padded format
 * 
 * @param phase - Phase number or string
 * @returns Normalized phase string
 * 
 * @example
 * ```typescript
 * normalizePhase(1) // returns "01"
 * normalizePhase("12") // returns "12"
 * normalizePhase("6.1") // returns "06.1"
 * normalizePhase("12A") // returns "12A"
 * normalizePhase("12A.1.2") // returns "12A.1.2"
 * ```
 */
export function normalizePhase(phase: string | number): string {
  const phaseStr = String(phase);
  const match = phaseStr.match(/^(\d+)([A-Z])?((?:\.\d+)*)/i);
  
  if (!match) {
    return phaseStr;
  }

  const padded = (match[1] ?? '').padStart(2, '0');
  const letter = match[2] ? match[2].toUpperCase() : '';
  const decimal = match[3] || '';

  return padded + letter + decimal;
}

/**
 * Validate parsed arguments
 * 
 * @param parsed - Parsed arguments
 * @param schema - Argument schema
 * @returns Validation result
 */
export function validateArgs(parsed: ParsedArgs, schema: ArgSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [...parsed.errors];

  // Check required fields
  for (const [key, def] of Object.entries(schema)) {
    if (def.required && parsed.flags[key] === undefined) {
      errors.push(`Missing required argument: ${key}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format help message for argument schema
 * 
 * @param schema - Argument schema
 * @param description - Command description
 * @returns Formatted help string
 */
export function formatArgHelp(schema: ArgSchema, description?: string): string {
  const lines: string[] = [];

  if (description) {
    lines.push(description);
    lines.push('');
  }

  lines.push('Arguments:');
  
  for (const [key, def] of Object.entries(schema)) {
    const alias = def.alias ? `-${def.alias}, ` : '';
    const typeDesc = def.type === 'boolean' ? '' : `<${def.type}>`;
    const required = def.required ? ' (required)' : '';
    const defaultDesc = def.default !== undefined ? ` [default: ${def.default}]` : '';
    
    lines.push(`  ${alias}--${key} ${typeDesc}${required}${defaultDesc}`);
    
    if (def.description) {
      lines.push(`    ${def.description}`);
    }
    
    if (def.choices) {
      lines.push(`    Choices: ${def.choices.join(', ')}`);
    }
  }

  return lines.join('\n');
}
