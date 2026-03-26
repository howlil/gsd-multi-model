# Phase 16 CONTEXT — Core Library Error Fixes

**Phase:** 16 — Core Library Error Fixes  
**Milestone:** v7.0.0 Zero TypeScript Errors  
**Created:** 2026-03-26  
**Status:** Ready for planning  

---

## Phase Goal

Fix all TypeScript errors in `bin/lib/` core library files (~200 errors across 25 files).

**Requirements:** CORE-01 to CORE-25 (25 requirements)

**Success Criteria:**
- Zero TypeScript errors in `bin/lib/` directory
- All type annotations correct
- Proper error handling throughout
- Build passes `tsc --noEmit` for core library

---

## Implementation Decisions

### 1. exactOptionalPropertyTypes Strategy

**Decision:** Strict compliance with explicit undefined handling

**Rationale:** v6.0.0 established type safety as core value. Relaxing rules now would undermine the migration work.

**Patterns to use:**

```typescript
// Property signatures — explicit union types
interface Options {
  entry: string | undefined;
  detectCircular: boolean;
  includeNpm: boolean;
}

// Constructor initialization with defaults
constructor(rootPath: string, options: DependencyGraphOptions = {}) {
  this.options = {
    entry: options.entry, // explicitly string | undefined
    detectCircular: options.detectCircular ?? true,
    includeNpm: options.includeNpm ?? false,
    tsConfig: options.tsConfig ?? 'tsconfig.json',
    ...options
  };
}

// Undefined handling — prefer nullish coalescing
const entryPoint = options.entry ?? null;
if (options.entry !== undefined) {
  // use options.entry safely
}

// Type guards for narrowing
function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
```

**Files affected:**
- `bin/lib/dependency-graph.ts` (2 errors)
- `bin/lib/tier-manager.ts` (2 errors)
- ~10 other files with options object patterns

**Migration approach:** Fix manually file-by-file for precision. Create codemod only if pattern repeats >20 times.

---

### 2. Error Handling Pattern

**Decision:** Type guard utility + inline narrowing hybrid

**Rationale:** Balance reusability with clarity. Type guards for complex logic, inline checks for simple catches.

**Implementation:**

```typescript
// Create bin/lib/error-utils.ts
/**
 * Type guard to narrow unknown to Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error || (
    typeof value === 'object' && 
    value !== null && 
    'message' in value
  );
}

/**
 * Type guard to narrow unknown to Error with code
 */
export function isErrorWithCode(value: unknown): value is Error & { code: string } {
  return isError(value) && 'code' in value && typeof value.code === 'string';
}
```

**Catch patterns:**

```typescript
// Simple catches — inline narrowing
try {
  // operation
} catch (err) {
  if (!(err instanceof Error)) throw err;
  logger.error(`Failed: ${err.message}`);
}

// Complex error handling — type guard
try {
  // operation
} catch (err: unknown) {
  if (isErrorWithCode(err) && err.code === 'ENOENT') {
    // handle file not found
  } else if (isError(err)) {
    // handle generic error
  } else {
    // handle unknown error type
  }
}

// Re-throw with context
try {
  // operation
} catch (err: unknown) {
  const error = isError(err) ? err : new Error(String(err));
  throw new FrontmatterError(`Parse failed: ${error.message}`, { cause: error });
}
```

**Custom error classes:** Create for major modules only:

```typescript
// bin/lib/frontmatter-errors.ts
export class FrontmatterError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = 'FrontmatterError';
  }
}

// bin/lib/git-errors.ts (already exists — extend it)
// bin/lib/deploy-errors.ts (new)
```

**Files affected:**
- `bin/lib/frontmatter.ts` (19 errors)
- `bin/lib/git-workflow-engine.ts` (6 errors)
- `bin/lib/index.ts` (32 errors — re-exports)
- `bin/lib/gates/*.ts` (10 errors)
- `bin/lib/perf/*.ts` (3 errors)

**Migration approach:** 
1. Create `error-utils.ts` first
2. Fix high-error files manually (frontmatter, git-workflow-engine)
3. Use find-replace for simple patterns
4. Run `tsc --noEmit` after each file

---

### 3. ChildProcess Type Conflicts

**Decision:** Explicit typing with wrapper function

**Rationale:** Direct typing is clearest. Wrapper function provides reuse and consistent error handling.

**Implementation:**

```typescript
// bin/lib/process-executor.ts (NEW)
import { 
  spawn, 
  execSync, 
  type SpawnOptions, 
  type ChildProcessWithoutNullStreams 
} from 'child_process';

export interface ProcessResult {
  success: boolean;
  output: string;
  code: number | null;
}

/**
 * Spawn a process with proper types and error handling
 */
export function spawnProcess(
  cmd: string, 
  args: string[], 
  options: SpawnOptions = {}
): ChildProcessWithoutNullStreams {
  const proc = spawn(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options
  }) as ChildProcessWithoutNullStreams;
  
  return proc;
}

/**
 * Execute command and capture output
 */
export async function executeProcess(
  cmd: string,
  args: string[],
  options: SpawnOptions & { timeout?: number } = {}
): Promise<ProcessResult> {
  return new Promise((resolve, reject) => {
    const proc = spawnProcess(cmd, args, options);
    let output = '';
    const timeout = options.timeout ?? 300000;
    
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`Process timeout after ${timeout}ms`));
    }, timeout);
    
    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });
    
    proc.stderr.on('data', (data: Buffer) => {
      output += data.toString();
    });
    
    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        success: code === 0,
        output,
        code
      });
    });
    
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
```

**Usage in deploy-runner.ts:**

```typescript
import { executeProcess } from '../process-executor.js';

async function run(platform: string, options: DeployOptions = {}): Promise<DeployResult> {
  const commands: Record<string, string[]> = {
    vercel: ['vercel', '--prod', ...(options.env ? ['--env', options.env] : [])],
    'fly.io': ['fly', 'deploy', ...(options.env ? ['--env', options.env] : [])],
    heroku: ['git', 'push', 'heroku', 'main'],
    railway: ['railway', 'up', ...(options.env ? ['--env', options.env] : [])]
  };

  const cmdArgs = commands[platform];
  if (!cmdArgs) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  const [cmd, ...args] = cmdArgs;
  
  try {
    const result = await executeProcess(cmd, args, {
      cwd: this.cwd,
      timeout: 300000
    });
    
    if (result.success) {
      return { success: true, output: result.output };
    } else {
      throw new Error(`Deploy failed with code ${result.code}`);
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    throw new Error(`Deploy failed: ${error.message}`);
  }
}
```

**Files affected:**
- `bin/lib/deploy/deploy-runner.ts` (5 errors)
- `bin/lib/safe-exec.ts` (1 error — extend with types)

**Migration approach:**
1. Create `process-executor.ts` utility
2. Refactor `deploy-runner.ts` to use it
3. Fix `safe-exec.ts` with explicit types

---

### 4. Barrel Export Circular Dependencies

**Decision:** Named exports only + direct imports for internal use

**Rationale:** Barrel exports (`export * from`) cause circular dependency issues. Named exports are explicit and prevent cycles.

**Implementation:**

```typescript
// bin/lib/index.ts — CURATED NAMED EXPORTS ONLY

// Core Infrastructure
export {
  MODEL_PROFILES,
  toPosixPath,
  output,
  error,
  safeReadFile,
  loadConfig,
  // ... only public API
} from './core.js';

export { Logger, defaultLogger } from './logger.js';

// Context Management — explicit named exports
export { ContextManager } from './context-manager.js';
export type { ContextOptions, ContextResult } from './context-manager.js';

export { ContextCache } from './context-cache.js';
export type { CacheEntry, CacheStats } from './context-cache.js';

// ... repeat for all modules

// DO NOT use: export * from './module.js'
```

**Import patterns:**

```typescript
// Public API consumption (outside bin/lib)
import { ContextManager, SkillResolver } from 'bin/lib/index.js';

// Internal consumption (within bin/lib) — DIRECT IMPORTS
import { ContextManager } from '../context-manager.js';
import { SkillResolver } from '../skill-resolver.js';

// Avoid importing from index.ts within bin/lib to prevent cycles
```

**Circular dependency prevention:**

```bash
# Add to package.json scripts
"check:deps": "madge --circular bin/lib/index.ts",
"check:deps:ts": "depcruise --validate .dependency-cruiser.js bin/lib"
```

**Files affected:**
- `bin/lib/index.ts` (32 errors — primary fix target)
- Any file importing from index.ts internally

**Migration approach:**
1. Audit current exports in index.ts
2. Replace `export * from` with named exports
3. Update internal imports to use direct paths
4. Run `madge --circular` to verify no cycles
5. Test build with `tsc --noEmit`

---

## Code Context

### Reusable Assets

**Existing utilities to leverage:**
- `bin/lib/error-registry.ts` — Error code definitions (extend with type guards)
- `bin/lib/safe-exec.ts` — Process execution (refactor with ProcessExecutor)
- `bin/lib/git-errors.ts` — Custom error classes (pattern for others)
- `bin/lib/facades/` — Facade pattern (apply to barrel export problem)

**New utilities to create:**
- `bin/lib/error-utils.ts` — Type guards for error handling
- `bin/lib/process-executor.ts` — Spawn wrapper with proper types
- `bin/lib/type-utils.ts` — Generic type helpers (isDefined, etc.)

### Integration Points

**Files to fix first (highest error count):**
1. `bin/lib/index.ts` (32 errors) — Barrel export cleanup
2. `bin/lib/frontmatter.ts` (19 errors) — Error handling
3. `bin/lib/git-workflow-engine.ts` (6 errors) — Error handling
4. `bin/lib/deploy/deploy-runner.ts` (5 errors) — ChildProcess types
5. `bin/lib/observer/*.ts` (8 errors) — EventEmitter types

**Dependencies:**
- Fix `error-utils.ts` first (used everywhere)
- Fix `index.ts` early (affects all imports)
- Fix core modules before dependents

### Error Patterns Reference

**Pattern 1: exactOptionalPropertyTypes**
```typescript
// BEFORE (error)
this.options = {
  entry: options.entry, // Type: string | undefined
  // Target expects: { entry?: string }
};

// AFTER (fixed)
this.options = {
  entry: options.entry, // Explicitly string | undefined
  detectCircular: options.detectCircular ?? true,
  // ... all properties with defaults or explicit undefined
};
```

**Pattern 2: Error type narrowing**
```typescript
// BEFORE (error)
catch (err) {
  if (!err.message.includes('timeout')) { // err is unknown
    // ...
  }
}

// AFTER (fixed)
catch (err) {
  if (!(err instanceof Error)) throw err;
  if (!err.message.includes('timeout')) {
    // ...
  }
}
```

**Pattern 3: ChildProcess typing**
```typescript
// BEFORE (error)
const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
proc.stdout.on('data', (data) => { // proc is never
  // ...
});

// AFTER (fixed)
const proc = spawn(cmd, args, { 
  stdio: ['ignore', 'pipe', 'pipe'] 
}) as ChildProcessWithoutNullStreams;
proc.stdout.on('data', (data: Buffer) => {
  // ...
});
```

**Pattern 4: Named exports**
```typescript
// BEFORE (error)
export * from './context-manager.js';

// AFTER (fixed)
export { ContextManager } from './context-manager.js';
export type { ContextOptions, ContextResult } from './context-manager.js';
```

---

## Deferred Ideas (v8.0.0 candidates)

**Noted for future milestones:**
- Comprehensive error code system with recovery hints
- Full facade layer for all public APIs
- Codemod automation for bulk type fixes
- Custom error classes for every module
- Process executor as full service with logging/metrics

---

## Next Steps

**Ready for:** `/ez:plan-phase 16` — Create detailed wave/plan breakdown

**Scope:** 25 requirements across 8 plans (16.1 to 16.8)

**Estimated effort:** 
- Wave 16.1: error-utils.ts + index.ts (40 errors)
- Wave 16.2: frontmatter.ts + gates (29 errors)
- Wave 16.3: git-workflow-engine.ts + others (15 errors)
- Wave 16.4: deploy-runner.ts + process-executor (6 errors)
- Wave 16.5-16.8: Remaining files (~110 errors)

---
*Context created: 2026-03-26*
*Ready for planning*
