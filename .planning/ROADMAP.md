# ez-agents v5.0.0 Roadmap — Complete TypeScript & OOP Transformation

**Project:** ez-agents v5.0.0
**Created:** 2026-03-24
**Milestone:** v5.0 Complete TypeScript & OOP Transformation
**Mode:** YOLO | **Granularity:** Standard | **Parallel:** Yes

## Overview

31 phases to complete TypeScript migration, OOP refactoring, zero TypeScript errors, test quality, and performance optimization.

**Total Requirements:** 215 across 5 parts
- Part 1: TypeScript Migration (42 requirements) ✅
- Part 2: OOP Refactoring (45 requirements) ✅
- Part 3: Zero TypeScript Errors (38 requirements) ✅
- Part 4: Test Quality (38 requirements, 1 complete) 🔄
- Part 5: Performance Optimization (50 requirements) 📋

---

## Phase 19: Analytics Implementation Tests

**Goal:** ~~Implement missing analytics methods and fix test expectations.~~ ❌ WON'T FIX

**Requirements Covered:** ANALYTICS-01 to ANALYTICS-06 (6 requirements)

**Status:** ❌ **WON'T FIX** - Analytics module removed in Phase 28 (Remove Over-Engineering)

**Reason:** 
- Zero production usage
- 83% test failure rate (20/24 tests failing)
- Module added unnecessary complexity (1200 lines)
- YAGNI principle: Not needed for core functionality

### Plans

- [x] **Plan 19.1**: Implement NPSTracker methods (ANALYTICS-01) ✅
  - ✅ Implemented (4/4 tests passing)
  - ℹ️ NpsTracker kept, other analytics removed

- [ ] ~~**Plan 19.2**: Implement AnalyticsCollector methods (ANALYTICS-02)~~ ❌ REMOVED
- [ ] ~~**Plan 19.3**: Implement AnalyticsReporter methods (ANALYTICS-03)~~ ❌ REMOVED
- [ ] ~~**Plan 19.4**: Implement CohortAnalyzer methods (ANALYTICS-04)~~ ❌ REMOVED
- [ ] ~~**Plan 19.5**: Implement FunnelAnalyzer methods (ANALYTICS-05)~~ ❌ REMOVED
- [ ] ~~**Plan 19.6**: Fix analytics CLI tests (ANALYTICS-06)~~ ❌ REMOVED

**Updated Test Progress:**
- Before Phase 28: 206/307 passing (67%)
- After Phase 28: 206/283 passing (73%) - 24 analytics tests removed
- Remaining failing tests: 77 (non-analytics)

---

## Phase 20: FinOps Implementation Tests

**Goal:** Implement missing FinOps methods and fix test expectations.

**Requirements Covered:** FINOPS-01 to FINOPS-06 (6 requirements)

**Status:** Not started

### Plans

- [ ] **Plan 20.1**: Implement BudgetEnforcer methods (FINOPS-01)
  - Implement `setBudget()` with warning threshold
  - Implement `checkBudget()` status logic
  - Implement `enforce()` blocking logic
  - Implement `getSpendingByCategory()` method

- [ ] **Plan 20.2**: Implement CostReporter methods (FINOPS-02)
  - Implement `generateReport()` method
  - Implement `getCostByService()` method
  - Implement `getCostByPeriod()` method
  - Implement `exportReport()` method
  - Implement `comparePeriods()` method

- [ ] **Plan 20.3**: Implement FinOpsAnalyzer methods (FINOPS-03)
  - Implement `analyzeCosts()` method
  - Implement `getOptimizationRecommendations()` method
  - Implement `detectAnomalies()` method
  - Implement `forecastSpending()` method
  - Implement `getCostPerUnit()` method

- [ ] **Plan 20.4**: Implement SpotManager methods (FINOPS-04)
  - Implement `requestSpotInstance()` method
  - Implement `handleInterruption()` method
  - Implement `getSpotSavings()` method
  - Implement `getOptimalSpotConfig()` method

- [ ] **Plan 20.5**: Fix FinOps CLI tests (FINOPS-05)
  - Fix `finops budget --set` test
  - Fix `finops budget --status` test
  - Fix `finops record --cost` test
  - Fix `finops report --period` test
  - Fix `finops analyze --recommendations` test
  - Fix `finops export --format` test

- [ ] **Plan 20.6**: Fix circuit breaker integration tests (FINOPS-06)
  - Fix state transition tests
  - Fix CircuitBreakerAdapter tests
  - Fix configuration tests

---

## Phase 21: Context Module Tests

**Goal:** Fix parse errors and test expectations in context module tests.

**Requirements Covered:** CONTEXT-01 to CONTEXT-08 (8 requirements)

**Status:** Not started

### Plans

- [ ] **Plan 21.1**: Fix ArchetypeDetector tests (CONTEXT-01)
  - Fix parse errors in test syntax
  - Fix test expectations for archetype detection
  - Fix confidence score tests

- [ ] **Plan 21.2**: Fix BusinessFlowMapper tests (CONTEXT-02)
  - Fix parse errors in test syntax
  - Fix `analyzeDataFlow()` tests
  - Fix `findIntegrationPoints()` tests

- [ ] **Plan 21.3**: Fix CodebaseAnalyzer tests (CONTEXT-03)
  - Fix parse errors in test syntax
  - Fix `classifyFile()` tests
  - Fix entry point detection tests

- [ ] **Plan 21.4**: Fix ConcernsReport tests (CONTEXT-04)
  - Fix parse errors in test syntax
  - Fix severity assignment tests
  - Fix file size threshold tests

- [ ] **Plan 21.5**: Fix ConstraintExtractor tests (CONTEXT-05)
  - Fix parse errors in test syntax
  - Fix extraction logic tests

- [ ] **Plan 21.6**: Fix DependencyGraph tests (CONTEXT-06)
  - Fix parse errors in test syntax
  - Fix graph construction tests

- [ ] **Plan 21.7**: Fix FrameworkDetector tests (CONTEXT-07)
  - Fix parse errors in test syntax
  - Fix framework detection tests

- [ ] **Plan 21.8**: Fix StackDetector tests (CONTEXT-08)
  - Fix parse errors in test syntax
  - Fix stack detection tests
  - Fix tech debt analyzer tests

---

## Phase 22: Core Module Tests

**Goal:** Fix core module test failures and parse errors.

**Requirements Covered:** CORE-01 to CORE-10 (10 requirements)

**Status:** Not started

### Plans

- [ ] **Plan 22.1**: Fix commands.test.ts (CORE-01)
  - Fix parse errors
  - Fix command execution tests

- [ ] **Plan 22.2**: Fix config.test.ts (CORE-02)
  - Fix `config-ensure-section` tests
  - Fix `config-set` tests
  - Fix `config-get` tests
  - Fix type coercion tests

- [ ] **Plan 22.3**: Fix content-scanner.test.ts (CORE-03)
  - Fix parse errors
  - Fix content scanning tests

- [ ] **Plan 22.4**: Fix context-manager.test.ts (CORE-04)
  - Fix parse errors
  - Fix context management tests

- [ ] **Plan 22.5**: Fix core.test.ts (CORE-05)
  - Fix parse errors
  - Fix core utility tests

- [ ] **Plan 22.6**: Fix dispatcher.test.ts (CORE-06)
  - Fix error path tests
  - Fix routing branch tests
  - Fix `find-phase` tests
  - Fix `roadmap update-plan-progress` tests
  - Fix `state` command tests
  - Fix `summary-extract` tests

- [ ] **Plan 22.7**: Fix file-access.test.ts (CORE-07)
  - Fix parse errors
  - Fix file access tests

- [ ] **Plan 22.8**: Fix file-lock-timeout.test.ts (CORE-08)
  - Fix LOCK-02 timeout test
  - Fix error shape tests

- [ ] **Plan 22.9**: Fix health-route.test.ts (CORE-09)
  - Fix health payload test
  - Fix status/checks/timestamp tests

- [ ] **Plan 22.10**: Fix planning-write-temp.test.ts (CORE-10)
  - Fix temp staging tests
  - Fix cleanup tests

---

## Phase 23: Integration & Roadmap Tests

**Goal:** Fix integration tests and roadmap test failures.

**Requirements Covered:** INTEGRATION-01 to INTEGRATION-08 (8 requirements)

**Status:** Not started

### Plans

- [ ] **Plan 23.1**: Fix e2e-workflow.test.ts (INTEGRATION-01)
  - Fix parse errors
  - Fix end-to-end workflow tests

- [ ] **Plan 23.2**: Fix foundation-logging-integration.test.ts (INTEGRATION-02)
  - Fix parse errors
  - Fix logging integration tests

- [ ] **Plan 23.3**: Fix frontmatter-cli.test.ts (INTEGRATION-03)
  - Fix parse errors
  - Fix frontmatter CLI tests

- [ ] **Plan 23.4**: Fix verify.test.ts (INTEGRATION-04)
  - Fix parse errors
  - Fix verification tests

- [ ] **Plan 23.5**: Fix roadmap.test.ts - analyze command (INTEGRATION-05)
  - Fix phase parsing tests
  - Fix goal extraction tests
  - Fix depends_on extraction tests
  - Fix disk status tests
  - Fix milestone extraction tests

- [ ] **Plan 23.6**: Fix roadmap.test.ts - missing phase details (INTEGRATION-06)
  - Fix checklist-only phase detection tests
  - Fix missing details tests

- [ ] **Plan 23.7**: Fix roadmap.test.ts - update-plan-progress (INTEGRATION-07)
  - Fix missing phase number error test
  - Fix nonexistent phase error test
  - Fix no plans found test
  - Fix partial completion test
  - Fix checkbox completion test
  - Fix missing ROADMAP.md test

- [ ] **Plan 23.8**: Fix remaining unit tests (INTEGRATION-08)
  - Fix learning-tracker.test.ts
  - Fix milestone.test.ts
  - Fix phase.test.ts
  - Fix quality-detector.test.ts
  - Fix quality-gate.test.ts
  - Fix rca-engine.test.ts
  - Fix revision-loop.test.ts
  - Fix security-fixes.test.ts
  - Fix skill-resolver.test.ts
  - Fix skill-validator.test.ts
  - Fix state.test.ts
  - Fix task-formatter.test.ts
  - Fix timeout-exec.test.ts
  - Fix tradeoff-analyzer.test.ts
  - Fix url-fetch.test.ts
  - Fix verify-health.test.ts

---

## Success Criteria

- [ ] All 104 failing tests pass
- [ ] Test pass rate: 100% (307/307)
- [ ] No parse errors in test files
- [ ] All analytics methods implemented
- [ ] All FinOps methods implemented
- [ ] All context module tests fixed
- [ ] All core module tests fixed
- [ ] All integration tests fixed
- [ ] Test coverage maintained at 70%+
- [ ] No new TypeScript errors introduced

---

## Technical Approach

**Test Fix Strategy:**
1. Fix parse errors first (syntax issues)
2. Implement missing methods (analytics, FinOps)
3. Fix test expectations (assertion mismatches)
4. Run tests after each phase
5. Maintain backward compatibility

**Implementation Priority:**
1. Phase 19: Analytics (6 requirements, 24 tests)
2. Phase 20: FinOps (6 requirements, 23 tests)
3. Phase 21: Context modules (8 requirements, 20 tests)
4. Phase 22: Core modules (10 requirements, 25 tests)
5. Phase 23: Integration (8 requirements, 12 tests)

**Testing:**
- Run `npm test` after each plan
- Maintain 70%+ coverage threshold
- No new TypeScript errors
- All existing passing tests remain passing

---

## Dependencies

**Requires:**
- v7.0.0 Zero TypeScript Errors ✅ (Complete)
- Clean TypeScript compilation
- Working test infrastructure (vitest)

**Blocks:**
- v9.0.0 Performance Optimization
- Production deployment confidence
- Feature development velocity

---

## Risks

**High Risk:**
- Analytics/FinOps implementations may require significant refactoring
- Some tests may have incorrect expectations

**Medium Risk:**
- Parse errors may indicate deeper test infrastructure issues
- Integration tests may fail due to external dependencies

**Mitigation:**
- Implement stubs first, then full implementations
- Fix syntax errors before functional issues
- Skip external dependency tests if needed

---

*Last updated: 2026-03-27*
