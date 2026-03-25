# Phase 11 - DRY Analysis Report (Before Refactoring)

**Date:** 2026-03-25
**Tool:** jscpd v4.0.0
**Configuration:** min-lines: 5, threshold: 10%

## Summary

| Metric | Value |
|--------|-------|
| Files analyzed | 142 TypeScript, 1 Markdown |
| Total lines | 33,529 (TypeScript) |
| Total tokens | 256,095 (TypeScript) |
| Clones found | 55 |
| Duplicated lines | 622 (1.86%) |
| Duplicated tokens | 7,000 (2.73%) |

## Key Duplicate Patterns Identified

### 1. Core.ts ↔ PhaseService.ts (Major - 37 clones)
**Location:** `bin/lib/core.ts` ↔ `bin/lib/services/phase.service.ts`
**Issue:** PhaseService duplicates standalone functions from core.ts
**Lines:** ~400 lines duplicated
**Action:** PhaseService should delegate to core.ts functions

### 2. PackageManagerExecutor Internal (15 clones)
**Location:** `bin/lib/package-manager-executor.ts`
**Issue:** Similar install/add argument building across package managers
**Lines:** ~100 lines duplicated
**Action:** Extract common logic to single method with package-specific overrides

### 3. Gate-04-Security Internal (3 clones)
**Location:** `bin/lib/gates/gate-04-security.ts`
**Issue:** Similar validation patterns
**Lines:** ~20 lines duplicated
**Action:** Extract to helper method

### 4. ConstraintExtractor Internal (5 clones)
**Location:** `bin/lib/constraint-extractor.ts`
**Issue:** Similar extraction patterns
**Lines:** ~40 lines duplicated
**Action:** Extract to template method

### 5. Frontmatter Internal (3 clones)
**Location:** `bin/lib/frontmatter.ts`
**Issue:** Similar parsing patterns
**Lines:** ~15 lines duplicated
**Action:** Extract to utility method

### 6. Commands.ts Internal (4 clones)
**Location:** `bin/lib/commands.ts`
**Issue:** Similar command execution patterns
**Lines:** ~60 lines duplicated
**Action:** Extract to command helper

### 7. Cross-file Duplicates
- `core.ts` ↔ `config.repository.ts`: Config loading patterns
- `planning-write.ts` internal: Writing patterns
- `quality-gate.ts` internal: Validation patterns
- `roadmap.ts` internal: Search patterns

## Acceptable Duplications

Some duplications are acceptable when:
- Code is in different modules with different reasons to change
- Abstraction would create more complexity than it solves
- Performance-critical code where inlining is beneficial

## Refactoring Priority

1. **HIGH:** Core.ts ↔ PhaseService.ts (largest duplication, same module)
2. **HIGH:** PackageManagerExecutor (internal duplication, easy win)
3. **MEDIUM:** Gate-04-Security, ConstraintExtractor
4. **LOW:** Frontmatter, Commands.ts (minor duplications)
