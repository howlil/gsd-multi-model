# Plan: 260325-kdt — Refactor All Remaining JavaScript (.cjs) to TypeScript (OOP/FP Hybrid)

**Date:** 2026-03-25
**Phase:** Phase 10 (Final Library Migration)
**Mode:** Quick
**Status:** Pending

---

## Overview

Migrate all 34 remaining `.cjs` files to TypeScript using the established OOP/FP hybrid architecture pattern from Phase 6 Wave 3.

**Files to migrate:**
- `bin/lib/core/` — 26 files
- `bin/lib/finops/` — 1 file
- `bin/guards/` — 7 files

**Total:** 34 files

---

## Architecture Pattern

Follow Phase 6 Wave 3 patterns (`.planning/phases/06-complete-library-migration/06-01-SUMMARY.md`):

### OOP Pattern (Stateful Services)
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

export interface SomeResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class SomeService {
  #privateField: string;

  constructor(config: SomeConfig) {
    this.#privateField = config.value;
  }

  public async doSomething(input: string): Promise<SomeResult> {
    // Implementation
  }
}
```

### FP Pattern (Pure Utilities)
```typescript
import { pipe } from '../fp/pipe.js';
import { transform } from '../fp/transform.js';

export interface UtilityOptions {
  param1: string;
  param2?: number;
}

export function utilityFunction(input: string, opts: UtilityOptions): string {
  return pipe(
    input,
    (x) => transform(x, opts),
    (x) => x.trim()
  );
}
```

### Requirements
- Strict TypeScript compliance
- No `any` types
- Explicit return types
- TSDoc comments on all exports
- Namespace imports for Node.js built-ins
- `.js` extensions in relative imports

---

## Migration Tasks

### Task 1: Core Library Services (13 files)

**Files:**
- `bin/lib/core/task-formatter.cjs` → `bin/lib/core/task-formatter.ts`
- `bin/lib/core/assistant-adapter.cjs` → `bin/lib/core/assistant-adapter.ts`
- `bin/lib/core/verify.cjs` → `bin/lib/core/verify.ts`
- `bin/lib/core/url-fetch.cjs` → `bin/lib/core/url-fetch.ts`
- `bin/lib/core/tier-manager.cjs` → `bin/lib/core/tier-manager.ts`
- `bin/lib/core/template.cjs` → `bin/lib/core/template.ts`
- `bin/lib/core/safe-exec.cjs` → `bin/lib/core/safe-exec.ts`
- `bin/lib/core/release-validator.cjs` → `bin/lib/core/release-validator.ts`
- `bin/lib/core/project-reporter.cjs` → `bin/lib/core/project-reporter.ts`
- `bin/lib/core/model-provider.cjs` → `bin/lib/core/model-provider.ts`
- `bin/lib/core/memory-compression.cjs` → `bin/lib/core/memory-compression.ts`
- `bin/lib/core/logger.cjs` → `bin/lib/core/logger.ts`
- `bin/lib/core/log-rotation.cjs` → `bin/lib/core/log-rotation.ts`

**Action:**
1. Read each `.cjs` file to understand structure
2. Create `.ts` file with:
   - Proper ESM imports (namespace for Node.js)
   - Interface/type definitions for all public APIs
   - Class or function implementations with full type annotations
   - TSDoc comments
3. Apply OOP pattern for stateful services (Logger, TierManager, ModelProvider)
4. Apply FP pattern for pure utilities (task-formatter, verify, template)
5. Run `npx tsc --noEmit --skipLibCheck bin/lib/core/*.ts` to verify compilation

**Verify:**
- [ ] All 13 files compile without errors
- [ ] No `any` types in code
- [ ] All exports have type annotations
- [ ] Original functionality preserved

**Done:**
- [ ] All 13 `.ts` files created and verified
- [ ] All 13 `.cjs` files deleted
- [ ] Compilation passes with exit code 0

---

### Task 2: Core Utilities & Config (13 files)

**Files:**
- `bin/lib/core/lock-logger.cjs` → `bin/lib/core/lock-logger.ts`
- `bin/lib/core/init.cjs` → `bin/lib/core/init.ts`
- `bin/lib/core/health-check.cjs` → `bin/lib/core/health-check.ts`
- `bin/lib/core/fs-utils.cjs` → `bin/lib/core/fs-utils.ts`
- `bin/lib/core/frontmatter.cjs` → `bin/lib/core/frontmatter.ts`
- `bin/lib/core/discussion-synthesizer.cjs` → `bin/lib/core/discussion-synthesizer.ts`
- `bin/lib/core/core.cjs` → `bin/lib/core/core.ts`
- `bin/lib/core/cost-alerts.cjs` → `bin/lib/core/cost-alerts.ts`
- `bin/lib/core/cost-tracker.cjs` → `bin/lib/core/cost-tracker.ts`
- `bin/lib/core/content-scanner.cjs` → `bin/lib/core/content-scanner.ts`
- `bin/lib/core/config.cjs` → `bin/lib/core/config.ts`
- `bin/lib/core/commands.cjs` → `bin/lib/core/commands.ts`
- `bin/lib/core/bdd-validator.cjs` → `bin/lib/core/bdd-validator.ts`
- `bin/lib/core/auth.cjs` → `bin/lib/core/auth.ts`

**Action:**
1. Read each `.cjs` file to understand structure
2. Create `.ts` file with proper types:
   - Config schemas using Zod where applicable
   - Result types for all operations
   - Class pattern for stateful (CostTracker, ContentScanner)
   - Function pattern for utilities (fs-utils, frontmatter, bdd-validator)
3. Ensure all imports use `.js` extension for relative paths
4. Run `npx tsc --noEmit --skipLibCheck bin/lib/core/*.ts` to verify compilation

**Verify:**
- [ ] All 14 files compile without errors
- [ ] Zod schemas for config/validation modules
- [ ] All function parameters and returns typed
- [ ] No circular dependencies introduced

**Done:**
- [ ] All 14 `.ts` files created and verified
- [ ] All 14 `.cjs` files deleted
- [ ] Compilation passes with exit code 0

---

### Task 3: FinOps & Guards (8 files)

**Files:**
- `bin/lib/finops/budget-enforcer.cjs` → `bin/lib/finops/budget-enforcer.ts`
- `bin/guards/team-overhead-guard.cjs` → `bin/guards/team-overhead-guard.ts`
- `bin/guards/tool-sprawl-guard.cjs` → `bin/guards/tool-sprawl-guard.ts`
- `bin/guards/hallucination-guard.cjs` → `bin/guards/hallucination-guard.ts`
- `bin/guards/hidden-state-guard.cjs` → `bin/guards/hidden-state-guard.ts`
- `bin/guards/context-budget-guard.cjs` → `bin/guards/context-budget-guard.ts`
- `bin/guards/autonomy-guard.cjs` → `bin/guards/autonomy-guard.ts`

**Action:**
1. Read each `.cjs` file to understand guard patterns
2. Create `.ts` files with:
   - Guard result types: `{ passed: boolean; warnings: string[]; errors: string[] }`
   - Guard options types for configuration
   - Class pattern for guards with internal state
   - BudgetEnforcer as service class with enforcement logic
3. Import FP utilities from `bin/lib/fp/` where applicable
4. Run `npx tsc --noEmit --skipLibCheck bin/lib/finops/*.ts bin/guards/*.ts` to verify

**Verify:**
- [ ] All 8 files compile without errors
- [ ] Guard pattern consistent across all guards
- [ ] Budget enforcer has proper enforcement types
- [ ] All guards export standardized result types

**Done:**
- [ ] All 8 `.ts` files created and verified
- [ ] All 8 `.cjs` files deleted
- [ ] Compilation passes with exit code 0
- [ ] All 34 files migrated complete

---

## Final Verification

After all tasks complete:

```bash
# Verify all TypeScript files compile
npx tsc --noEmit --skipLibCheck \
  bin/lib/core/*.ts \
  bin/lib/finops/*.ts \
  bin/guards/*.ts

# Verify no .cjs files remain
find bin/lib -name "*.cjs" | wc -l  # Should be 0
find bin/guards -name "*.cjs" | wc -l  # Should be 0
```

**Success Criteria:**
- ✅ 34 TypeScript files created
- ✅ 34 CommonJS files deleted
- ✅ 100% type coverage (no `any` types)
- ✅ Zero compilation errors
- ✅ Backward compatible APIs

---

## Estimated Effort

- **Task 1:** 13 files × ~15 min = ~3.25 hours
- **Task 2:** 14 files × ~15 min = ~3.5 hours
- **Task 3:** 8 files × ~15 min = ~2 hours
- **Verification & fixes:** ~1 hour

**Total:** ~10 hours

---

## Files to Update After Migration

- `.planning/STATE.md` — Update Phase 10 progress
- `MIGRATION.md` — Add Phase 10 section
- `.planning/quick/260325-kdt-refactor-all-js-into-ts-oop-hybrid-fp-de/260325-kdt-SUMMARY.md` — Create summary

---

*Plan created: 2026-03-25*
*Phase 10: Final Library Migration*
