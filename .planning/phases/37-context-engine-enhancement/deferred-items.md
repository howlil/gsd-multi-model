# Deferred Items — Phase 37 Context Engine Enhancement

## Out-of-Scope Issues Discovered During Plan 37-02

### Pre-existing test failures in tests/verify.test.cjs

**Discovered during:** Plan 37-02 task commit
**Nature:** Pre-existing failures unrelated to current work

**Failing tests:**
- `handles mixed valid and invalid hashes` — expects 1 valid commit hash but returns 0 valid
- At least one other verify test failing

**Evidence:** Failures existed before any Plan 37-02 changes (confirmed via `git stash` verification)

**Impact:** Pre-commit hook runs full test suite → blocks all commits when these tests fail

**Recommended fix:** Investigate `tests/verify.test.cjs` — likely the test checks against a specific git hash that has since changed, or the verify command logic changed without test updates

**Deferred because:** Out of scope for Plan 37-02 (Stack Detection Engine)
