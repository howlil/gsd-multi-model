# Quick Task 260326-u97 — Fix Test Import Paths

**Created:** 2026-03-26
**Status:** In Progress
**Mode:** YOLO

---

## Task Description

Fix ESM import path issues in test files that cause `npm test` to fail.

## Progress

### ✅ Completed

1. **vitest.config.ts updated** — Added alias for .js extension resolution
2. **core.test.ts fixed** — Converted from CommonJS to ESM + Vitest
   - Replaced `require('node:test')` with `import { describe, it, expect } from 'vitest'`
   - Replaced `assert` calls with `expect()` matchers
   - All imports working correctly

### Test Results

**Before:** 92 failures (import errors)
**After:** 61 passed, 11 failed (assertion issues being fixed)

The 11 remaining failures are test logic issues (expecting `undefined` vs `null`), not import issues.

### Next Steps

1. Fix remaining test files with same pattern
2. Run full test suite with vitest

---

*Updated: 2026-03-26*
