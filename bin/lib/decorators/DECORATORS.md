# Decorator Usage Guide

**Location:** `bin/lib/decorators/`

This document describes the TypeScript decorators used for cross-cutting concerns in the ez-agents codebase.

## Overview

Decorators provide a clean way to add cross-cutting concerns (logging, caching, validation) to classes without modifying their core logic. This separates business logic from infrastructure concerns.

## Available Decorators

### 1. `@LogExecution`

Logs method execution including entry, exit, duration, and optional parameters/results.

**File:** `LogExecution.ts`

**Signature:**
```typescript
@LogExecution(methodName: string, options?: LogExecutionOptions)
```

**Options:**
- `logParams?: boolean` — Log method parameters on entry (default: false)
- `logResult?: boolean` — Log method result on exit (default: false)
- `logDuration?: boolean` — Log execution duration (default: false)
- `level?: 'info' | 'debug' | 'trace' | 'warn' | 'error'` — Log level (default: 'debug')
- `paramName?: string` — Log specific parameter by name

**Example:**
```typescript
import { LogExecution } from './decorators/index.js';

export class SessionManager {
  @LogExecution('SessionManager.createSession', { logParams: true, level: 'info' })
  createSession(sessionId: string): SessionState {
    // Implementation
  }

  @LogExecution('SessionManager.loadState', { logParams: false, logResult: false })
  loadState(): SessionState | null {
    // Implementation
  }
}
```

**Log Output:**
```
[SessionManager] Entering SessionManager.createSession { sessionId: 'abc123' }
[SessionManager] Completed SessionManager.createSession { duration: '5ms' }
```

**Classes Using @LogExecution:**
- `SessionManager` — loadState, saveState, createSession, clearSession
- `ContextManager` — requestContext, getCached, clearCache, getCacheStats
- `SkillResolver` — resolve, detectConflict, classifyConflict, applyPriorityRules, logDecision
- `CircuitBreaker` — execute, getState, getStats, reset
- `ErrorCache` — fingerprint, record, isRecurring, get, clear, stats, getAll

---

### 2. `@CacheResult`

Caches method results with configurable TTL (time-to-live). Returns cached value if not expired.

**File:** `CacheResult.ts`

**Signature:**
```typescript
@CacheResult(cacheKeyFn: (...args: any[]) => string, ttl?: number)
```

**Parameters:**
- `cacheKeyFn` — Function to generate cache key from method arguments
- `ttl` — Time-to-live in milliseconds (default: 300000ms / 5 minutes)

**Example:**
```typescript
import { CacheResult } from './decorators/index.js';

export class ContextCompressor {
  @CacheResult(
    (content, options) => `compress:${hash(content)}:${JSON.stringify(options)}`,
    600000 // 10 minutes
  )
  async compress(content: string, options: CompressionOptions): Promise<CompressionResult> {
    // Implementation
  }
}
```

**Cache Utilities:**
```typescript
import { clearCache, clearAllCache, getCacheStats } from './decorators/index.js';

// Clear specific cache entry
clearCache('compress:abc123');

// Clear all cache entries
clearAllCache();

// Get cache statistics
const stats = getCacheStats(); // { size: number, keys: string[] }
```

**Log Output:**
```
[ContextCompressor] CacheResult hit for compress:abc123
[ContextCompressor] CacheResult miss for compress:def456, cached result
```

**Classes Using @CacheResult:**
- (To be applied to ContextCompressor, ContextRelevanceScorer, SkillMatcher, SkillContextResolver)

---

### 3. `@ValidateInput`

Validates method inputs before execution. Throws validation error if validator fails.

**File:** `ValidateInput.ts`

**Signature:**
```typescript
@ValidateInput(validatorFn: (...args: any[]) => void)
```

**Parameters:**
- `validatorFn` — Validator function that throws on validation failure

**Example:**
```typescript
import { ValidateInput } from './decorators/index.js';

export class SkillResolver {
  @ValidateInput((skills: Skill[], context: Record<string, unknown>) => {
    if (!Array.isArray(skills)) throw new Error('Skills must be an array');
    if (!context) throw new Error('Context is required');
  })
  resolve(skills: Skill[], context: Record<string, unknown> = {}): ResolveResult {
    // Implementation
  }
}
```

**Validation Error Handling:**
```typescript
try {
  resolver.resolve('not-an-array' as any, {});
} catch (error) {
  console.error(error.message); // "Skills must be an array"
}
```

**Classes Using @ValidateInput:**
- `SkillResolver` — resolve

---

## Combining Decorators

Multiple decorators can be stacked on a single method. They execute in order from top to bottom:

```typescript
export class SkillResolver {
  @ValidateInput((skills: Skill[]) => {
    if (!Array.isArray(skills)) throw new Error('Skills must be an array');
  })
  @LogExecution('SkillResolver.resolve', { logParams: false })
  resolve(skills: Skill[], context: Record<string, unknown> = {}): ResolveResult {
    // Validation runs first, then logging wraps the execution
  }
}
```

**Execution Order:**
1. `@ValidateInput` — Validates input parameters
2. `@LogExecution` — Logs method entry/exit
3. Original method executes

---

## Type Definitions

All decorator type definitions are in `types.ts`:

```typescript
export interface LogExecutionOptions {
  logParams?: boolean;
  logResult?: boolean;
  logDuration?: boolean;
  level?: 'info' | 'debug' | 'trace' | 'warn' | 'error';
  paramName?: string;
}

export interface CacheResultOptions {
  ttl?: number;
  cacheKeyFn?: (...args: any[]) => string;
}

export interface ValidateInputOptions {
  validatorFn: (...args: any[]) => void;
}

export interface CacheEntry<T = any> {
  value: T;
  expiry: number;
}
```

---

## Configuration

### TypeScript Configuration

Decorators require the following `tsconfig.json` settings:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": true
  }
}
```

### Importing Decorators

```typescript
// Import individual decorators
import { LogExecution, CacheResult, ValidateInput } from './decorators/index.js';

// Import types
import type { LogExecutionOptions, CacheResultOptions } from './decorators/index.js';
```

---

## Best Practices

### 1. Use Descriptive Method Names
```typescript
// Good
@LogExecution('ContextManager.requestContext', { ... })

// Avoid
@LogExecution('requestContext', { ... })
```

### 2. Choose Appropriate Log Levels
```typescript
// Info for important operations (session creation, errors)
@LogExecution('SessionManager.createSession', { level: 'info' })

// Debug for routine operations
@LogExecution('ContextManager.getCached', { level: 'debug' })
```

### 3. Avoid Logging Sensitive Data
```typescript
// Don't log params if they contain sensitive info
@LogExecution('AuthService.login', { logParams: false })
```

### 4. Use Cache Wisely
```typescript
// Good for expensive operations with deterministic results
@CacheResult(
  (content) => `compress:${hash(content)}`,
  600000 // 10 minutes
)

// Avoid for operations with side effects
// Don't cache: saveFile(), sendEmail(), etc.
```

### 5. Keep Validators Simple
```typescript
// Good
@ValidateInput((skills) => {
  if (!Array.isArray(skills)) throw new Error('Skills must be an array');
})

// Avoid complex logic in validator
```

---

## Testing Decorators

### Testing @LogExecution
```typescript
import { describe, it, expect } from 'vitest';
import { SessionManager } from './session-manager.js';

describe('SessionManager with @LogExecution', () => {
  it('should log method execution', () => {
    const manager = new SessionManager('/tmp');
    const session = manager.createSession('test-123');
    expect(session.sessionId).toBe('test-123');
  });
});
```

### Testing @CacheResult
```typescript
import { clearAllCache, getCacheStats } from './decorators/index.js';

describe('ContextCompressor with @CacheResult', () => {
  beforeEach(() => {
    clearAllCache(); // Clear cache before each test
  });

  it('should cache compression results', () => {
    const compressor = new ContextCompressor();
    const result1 = compressor.compress('test content', {});
    const result2 = compressor.compress('test content', {});
    
    expect(getCacheStats().size).toBe(1);
    expect(result1).toBe(result2); // Same cached result
  });
});
```

### Testing @ValidateInput
```typescript
describe('SkillResolver with @ValidateInput', () => {
  it('should throw on invalid input', () => {
    const resolver = new SkillResolver();
    expect(() => resolver.resolve('not-an-array' as any, {}))
      .toThrow('Skills must be an array');
  });
});
```

---

## Troubleshooting

### Decorators Not Working

**Problem:** Decorators are not being applied at runtime.

**Solution:**
1. Verify `experimentalDecorators: true` in `tsconfig.json`
2. Ensure decorators are imported correctly
3. Check that decorator is placed directly above method declaration

### Cache Not Working

**Problem:** Cache always misses or never expires.

**Solution:**
1. Verify cache key function generates consistent keys
2. Check TTL value (default: 300000ms / 5 minutes)
3. Use `getCacheStats()` to inspect cache state

### Logging Too Verbose

**Problem:** Too many log messages cluttering output.

**Solution:**
1. Reduce log level from 'info' to 'debug'
2. Disable `logParams` and `logResult` options
3. Filter logs at the logger level

---

## API Reference

### Exports from `decorators/index.js`

**Functions:**
- `LogExecution(methodName, options)` — Method logging decorator
- `CacheResult(cacheKeyFn, ttl)` — Result caching decorator
- `ValidateInput(validatorFn)` — Input validation decorator
- `clearCache(key)` — Clear specific cache entry
- `clearAllCache()` — Clear all cache entries
- `getCacheStats()` — Get cache statistics

**Types:**
- `LogExecutionOptions` — Options for LogExecution
- `CacheResultOptions` — Options for CacheResult
- `ValidateInputOptions` — Options for ValidateInput
- `CacheEntry<T>` — Cache entry structure

---

**Created:** 2026-03-25  
**Phase:** 10 | **Wave:** 10.2 | **Requirement:** CORE-06
