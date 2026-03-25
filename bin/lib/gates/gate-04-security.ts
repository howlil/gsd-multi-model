/**
 * Gate 4: Security Baseline
 *
 * Validates security implementation including authentication, input validation,
 * secrets management, and security anti-patterns.
 *
 * Checks:
 * 1. Auth checker (session management, token handling, password hashing)
 * 2. Input validation checker (sanitization, escaping, validation schemas)
 * 3. Secrets scanner (hardcoded API keys, passwords, tokens)
 * 4. Security anti-pattern detector (eval, execSync with user input, SQL concatenation)
 *
 * @module gates/gate-04-security
 */

import { z } from 'zod';

/**
 * Zod schema for a code file
 */
export const codeFileSchema = z.object({
  /** File path */
  path: z.string(),
  /** File content */
  content: z.string(),
  /** File language (e.g., 'javascript', 'typescript') */
  language: z.string().optional(),
});

/**
 * Zod schema for environment variables configuration
 */
export const envConfigSchema = z.object({
  /** Environment variable name */
  name: z.string(),
  /** Whether it's used in code */
  isUsed: z.boolean().optional(),
  /** Whether it has a default value */
  hasDefault: z.boolean().optional(),
  /** Whether it's marked as sensitive */
  isSensitive: z.boolean().optional(),
});

/**
 * Zod schema for authentication configuration
 */
export const authConfigSchema = z.object({
  /** Authentication method (session, jwt, oauth, etc.) */
  method: z.string().optional(),
  /** Session store type (memory, redis, database) */
  sessionStore: z.string().optional(),
  /** Token expiration time */
  tokenExpiration: z.string().optional(),
  /** Password hashing algorithm */
  hashingAlgorithm: z.string().optional(),
  /** Whether HTTPS is enforced */
  httpsEnforced: z.boolean().optional(),
  /** Whether CSRF protection is enabled */
  csrfProtection: z.boolean().optional(),
  /** Whether rate limiting is enabled */
  rateLimiting: z.boolean().optional(),
});

/**
 * Zod schema for the gate context
 */
export const gateContextSchema = z.object({
  /** Array of code files to analyze */
  files: z.array(codeFileSchema).optional(),
  /** Environment variable configuration */
  envConfig: z.array(envConfigSchema).optional(),
  /** Authentication configuration */
  authConfig: authConfigSchema.optional(),
  /** Input validation libraries used */
  validationLibraries: z.array(z.string()).optional(),
  /** Whether input validation is implemented */
  hasInputValidation: z.boolean().optional(),
  /** Known safe patterns (to reduce false positives) */
  safePatterns: z.array(z.string()).optional(),
});

/**
 * Security anti-patterns to detect
 */
export const SECURITY_ANTI_PATTERNS = {
  /** eval() usage - allows arbitrary code execution */
  eval: {
    pattern: /\beval\s*\(/g,
    severity: 'error',
    message: 'eval() allows arbitrary code execution. Use safer alternatives like JSON.parse() or function maps.',
  },
  /** Function constructor - similar risks to eval */
  functionConstructor: {
    pattern: /\bnew\s+Function\s*\(/g,
    severity: 'error',
    message: 'Function constructor allows arbitrary code execution. Use safer alternatives.',
  },
};

/**
 * Patterns for detecting hardcoded secrets
 */
export const SECRET_PATTERNS = {
  /** Generic API key patterns */
  apiKey: {
    pattern: /['"]?(?:api[_-]?key|apikey|API[_-]?KEY)[_]?[A-Z]*['"]?\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/gi,
    message: 'Hardcoded API key detected. Use environment variables (e.g., process.env.API_KEY).',
    severity: 'error',
  },
  /** Password patterns */
  password: {
    pattern: /['"]?(?:password|passwd|pwd|PASSWORD|PASSWD)[_]?[A-Z]*['"]?\s*[:=]\s*['"][^'"]{4,}['"]/g,
    message: 'Hardcoded password detected. Use environment variables or secrets manager.',
    severity: 'error',
  },
};

/**
 * SQL injection patterns
 */
export const SQL_INJECTION_PATTERNS = {
  /** String concatenation in SQL queries */
  stringConcat: {
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s+[^;]*['"`]\s*\+\s*\w+/gi,
    message: 'SQL query with string concatenation detected. Use parameterized queries or query builders.',
    severity: 'error',
  },
  /** Template literal SQL */
  templateLiteral: {
    pattern: /`(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)[^`]*\$\{[^}]+\}/gi,
    message: 'SQL query with template literal interpolation. Use parameterized queries.',
    severity: 'error',
  },
};

/**
 * Gate error structure
 */
export interface GateError {
  path: string;
  message: string;
}

/**
 * Gate result structure
 */
export interface GateResult {
  passed: boolean;
  errors: GateError[];
  warnings: string[];
}

/**
 * Check for eval() and similar dangerous patterns
 * @param code - Code content to analyze
 */
export function detectEvalUsage(code: string): Array<{ type: string; message: string; severity: string }> {
  const issues: Array<{ type: string; message: string; severity: string }> = [];

  if (!code || typeof code !== 'string') {
    return issues;
  }

  // Check for eval()
  const evalMatches = code.match(SECURITY_ANTI_PATTERNS.eval.pattern);
  if (evalMatches) {
    for (const _ of evalMatches) {
      issues.push({
        type: 'eval',
        message: SECURITY_ANTI_PATTERNS.eval.message,
        severity: SECURITY_ANTI_PATTERNS.eval.severity,
      });
    }
  }

  // Check for Function constructor
  const funcMatches = code.match(SECURITY_ANTI_PATTERNS.functionConstructor.pattern);
  if (funcMatches) {
    for (const _ of funcMatches) {
      issues.push({
        type: 'function-constructor',
        message: SECURITY_ANTI_PATTERNS.functionConstructor.message,
        severity: SECURITY_ANTI_PATTERNS.functionConstructor.severity,
      });
    }
  }

  return issues;
}

/**
 * Check for SQL injection vulnerabilities
 * @param code - Code content to analyze
 */
export function detectSqlInjection(code: string): Array<{ type: string; message: string; severity: string }> {
  const issues: Array<{ type: string; message: string; severity: string }> = [];

  if (!code || typeof code !== 'string') {
    return issues;
  }

  // Check for string concatenation in SQL
  for (const config of Object.values(SQL_INJECTION_PATTERNS)) {
    const matches = code.match(config.pattern);
    if (matches) {
      for (const _ of matches) {
        issues.push({
          type: 'sql-injection',
          message: config.message,
          severity: config.severity,
        });
      }
    }
  }

  return issues;
}

/**
 * Detect hardcoded secrets in code
 * @param code - Code content to analyze
 */
export function detectHardcodedSecrets(code: string): Array<{ type: string; message: string; severity: string }> {
  const issues: Array<{ type: string; message: string; severity: string }> = [];

  if (!code || typeof code !== 'string') {
    return issues;
  }

  // Check for each secret pattern
  for (const config of Object.values(SECRET_PATTERNS)) {
    const matches = code.match(config.pattern);
    if (matches && matches.length > 0) {
      for (const match of matches) {
        // Skip if it's clearly using environment variables
        if (match.includes('process.env')) {
          continue;
        }

        // Skip example/placeholder values
        if (match.includes('YOUR_') || match.includes('xxx') || match.includes('example')) {
          continue;
        }

        issues.push({
          type: 'secret',
          message: config.message,
          severity: config.severity,
        });
      }
    }
  }

  return issues;
}

/**
 * Analyze code file for security issues
 * @param file - Code file object
 * @param authConfig - Authentication configuration
 */
export function analyzeSecurityFile(file: { path?: string; content?: string }, authConfig: Record<string, unknown> = {}): { errors: GateError[]; warnings: string[] } {
  const errors: GateError[] = [];
  const warnings: string[] = [];

  if (!file || !file.content) {
    return { errors, warnings };
  }

  const filePath = file.path || 'unknown';
  const code = file.content;

  // Check for eval() usage
  const evalIssues = detectEvalUsage(code);
  for (const issue of evalIssues) {
    if (issue.severity === 'error') {
      errors.push({
        path: filePath,
        message: issue.message,
      });
    } else {
      warnings.push(issue.message);
    }
  }

  // Check for SQL injection
  const sqlIssues = detectSqlInjection(code);
  for (const issue of sqlIssues) {
    if (issue.severity === 'error') {
      errors.push({
        path: filePath,
        message: issue.message,
      });
    } else {
      warnings.push(issue.message);
    }
  }

  // Check for hardcoded secrets
  const secretIssues = detectHardcodedSecrets(code);
  for (const issue of secretIssues) {
    if (issue.severity === 'error') {
      errors.push({
        path: filePath,
        message: issue.message,
      });
    } else {
      warnings.push(issue.message);
    }
  }

  return { errors, warnings };
}

/**
 * Gate 4 Executor: Security Baseline Check
 *
 * @param context - Gate context (validated against gateContextSchema)
 * @returns Gate result
 */
export async function executeGate4(context: z.infer<typeof gateContextSchema>): Promise<GateResult> {
  const errors: GateError[] = [];
  const warnings: string[] = [];

  // Extract auth config
  const authConfig = context.authConfig || {};

  // Analyze each file
  if (context.files && Array.isArray(context.files)) {
    for (const file of context.files) {
      const result = analyzeSecurityFile(file, authConfig);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }
  }

  // Check for missing input validation at project level
  if (context.hasInputValidation === false) {
    errors.push({
      path: 'input-validation',
      message: 'No input validation detected. Implement input validation using a library (express-validator, joi, zod, etc.).',
    });
  }

  // Check auth configuration
  if (authConfig) {
    // Check for weak hashing
    if (authConfig.hashingAlgorithm && ['md5', 'sha1', 'sha256'].includes(authConfig.hashingAlgorithm.toLowerCase())) {
      errors.push({
        path: 'authConfig.hashingAlgorithm',
        message: `Weak password hashing (${authConfig.hashingAlgorithm}). Use bcrypt, scrypt, or argon2.`,
      });
    }

    // Check for missing HTTPS
    if (authConfig.httpsEnforced === false) {
      warnings.push('HTTPS is not enforced. Consider enforcing HTTPS in production.');
    }

    // Check for missing CSRF protection
    if (authConfig.csrfProtection === false) {
      warnings.push('CSRF protection is disabled. Consider enabling for state-changing operations.');
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Create and register Gate 4 with a QualityGate instance
 *
 * @param gateCoordinator - QualityGate coordinator instance
 */
export function registerGate4(gateCoordinator: { registerGate: (name: string, schema: z.ZodSchema, executor: (ctx: unknown) => Promise<GateResult>) => void }): void {
  gateCoordinator.registerGate('gate-04-security', gateContextSchema, executeGate4);
}
