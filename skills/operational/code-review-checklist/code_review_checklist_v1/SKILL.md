---
name: Code Review Checklist
description: Comprehensive code review with eight pillars of quality
version: 1.0.0
tags: [code-review, quality, best-practices, checklist]
category: operational
triggers:
  keywords: [code review, pull request, pr]
  modes: [all]
eight_pillars:
  Documentation Quality: "Public APIs documented, complex algorithms explained, usage examples"
  Style Consistency: "Follows style guide, naming conventions, formatting standards"
  Logic & Correctness: "Execution paths traced, boundary conditions verified, null handling"
  Test Coverage: "Unit/integration tests, meaningful assertions, edge cases covered"
  Security: "Input validation, SQL injection prevention, authentication, no hardcoded credentials"
  Performance: "Critical paths profiled, queries optimized, algorithmic complexity analyzed"
  Code Duplication (DRY): "Duplication detection, proper abstractions, no redundant config"
  Dependency Management: "Security scanning, license compliance, dependency health"
quality_gates:
  test_coverage: "70-90%"
  security_vulnerabilities: "0 high-severity"
  code_duplication: "< 5%"
  dependency_vulnerabilities: "0 unpatched"
  documentation_coverage: "All public APIs"
implementation_phases:
  - phase: "Phase 1 — Highest Impact"
    focus: "Code correctness, Security vulnerabilities"
  - phase: "Phase 2 — Quality Standards"
    focus: "Test coverage, Documentation quality"
  - phase: "Phase 3 — Optimization"
    focus: "Performance, Code duplication"
  - phase: "Phase 4 — Maintenance"
    focus: "Style consistency, Dependency management"
---

# Code Review Checklist

## Purpose

Provide a comprehensive, structured approach to code reviews using eight quality pillars. Ensures consistent quality standards across all pull requests.

## Eight Pillars of Code Quality

### Pillar 1: Documentation Quality

Good code is self-documenting, but some documentation is always necessary:

- **Public APIs:** Every public function, class, or method has a docstring/JSDoc/PHPDoc
- **Complex algorithms:** Non-obvious logic includes an explanation of the approach
- **Usage examples:** Complex APIs include at least one usage example
- **Inline comments:** Explain "why" not "what" — code tells you what, comments tell you why

**Red flags:** `// TODO`, `// FIXME`, undocumented parameters with unclear names.

### Pillar 2: Style Consistency

Consistency reduces cognitive load:

- Code follows the project's style guide (ESLint, Prettier, Black, PHP-CS-Fixer, etc.)
- Naming conventions consistent with existing codebase (camelCase vs snake_case, etc.)
- File organization follows project conventions
- Import ordering consistent with project standards

**Automate this:** Use linters and formatters in CI. Style reviews should be automated, not manual.

### Pillar 3: Logic and Correctness

The most critical pillar — the code must work correctly:

- **Trace execution paths:** Walk through the happy path and at least 2 edge cases
- **Boundary conditions:** What happens with empty inputs, null values, maximum values?
- **Off-by-one errors:** Array indexing, pagination, date range calculations
- **Race conditions:** Concurrent access to shared state, database transactions
- **Error handling:** All error paths explicitly handled (no silent catches)

**Questions to ask:** "What happens if this is null?", "What if this runs twice concurrently?"

### Pillar 4: Test Coverage

Tests are the specification:

- Unit tests for new functions and classes
- Integration tests for new endpoints or service interactions
- Edge cases covered in tests (not just happy path)
- Assertions are meaningful (test behavior, not implementation)
- Test names describe the scenario, not the method

**Coverage quality:** 80% coverage with meaningful tests > 95% coverage with trivial tests.

### Pillar 5: Security

Security issues caught in review cost 100x less than in production:

- **Input validation:** All user inputs validated and sanitized
- **SQL injection:** Parameterized queries, no string concatenation in SQL
- **Authentication:** Protected routes/endpoints require valid auth
- **Authorization:** Users can only access their own data
- **Secrets:** No hardcoded API keys, passwords, or tokens
- **Sensitive data logging:** No PII, passwords, or tokens in logs
- **Dependency versions:** No known vulnerable packages

**Zero tolerance:** Security vulnerabilities are always blocking comments, never suggestions.

### Pillar 6: Performance

Performance issues are often invisible until scale:

- **Critical paths profiled:** Response time measured for key operations
- **Database queries:** N+1 queries identified, indexes verified for new query patterns
- **Algorithmic complexity:** O(n²) or worse algorithms flagged for review
- **Caching:** Appropriate caching for expensive, repeated operations
- **Memory:** No obvious memory leaks (unclosed connections, unbounded collections)

**Context matters:** A 50ms delay in a batch job is fine; same delay in an API response is not.

### Pillar 7: Code Duplication (DRY)

Duplication is the root of most maintenance problems:

- **Duplicate logic detected:** Same algorithm in 2+ places → extract to shared function
- **Proper abstractions:** Abstraction level matches the problem (not over-engineered, not under-abstracted)
- **Configuration:** No duplicate config values; use constants or config files
- **Copy-paste code:** Flag copy-paste with minor modifications — should be parameterized

**DRY vs DAMP (Descriptive And Meaningful Phrases):** In tests, some duplication improves readability. Apply DRY strictly to business logic.

### Pillar 8: Dependency Management

Dependencies are borrowed technical debt:

- **Security scanning:** New dependencies scanned for known vulnerabilities
- **License compliance:** New dependencies compatible with project's license
- **Maintenance status:** New dependencies actively maintained (recent commit activity)
- **Version pinning:** Dependencies pinned to specific versions (not `latest` or `*`)
- **Bundle size impact:** Frontend dependencies analyzed for bundle size impact

## Quality Gates

| Gate | Threshold | Action if Failed |
|------|-----------|-----------------|
| Test coverage | 70-90% | Blocking — add tests |
| Security vulnerabilities | 0 high-severity | Blocking — fix before merge |
| Code duplication | < 5% | Blocking above 10%, warning 5-10% |
| Dependency vulnerabilities | 0 unpatched | Blocking — update or replace |
| Documentation coverage | All public APIs | Blocking — add docs |

## Implementation Phases

For teams new to structured code review, implement in phases:

### Phase 1 — Highest Impact (Start Here)

Focus: **Code correctness** and **Security vulnerabilities**

These catch the most critical issues. Start every PR review here.

### Phase 2 — Quality Standards

Focus: **Test coverage** and **Documentation quality**

Build these habits before optimizing.

### Phase 3 — Optimization

Focus: **Performance** and **Code duplication**

Add these checks once Phase 1-2 are habits.

### Phase 4 — Maintenance

Focus: **Style consistency** and **Dependency management**

Automate as much as possible. Style = linter, dependencies = automated scanning.

## Code Review Checklist

```
Pillar 1 — Documentation:
[ ] Public APIs have docstrings/comments
[ ] Complex logic is explained
[ ] No unexplained TODOs added

Pillar 2 — Style:
[ ] Passes automated linting/formatting
[ ] Naming consistent with codebase

Pillar 3 — Logic & Correctness:
[ ] Happy path traced through code
[ ] Edge cases considered (null, empty, max values)
[ ] Error paths explicitly handled

Pillar 4 — Tests:
[ ] New functionality has unit tests
[ ] Edge cases covered in tests
[ ] Test names are descriptive

Pillar 5 — Security:
[ ] Inputs validated and sanitized
[ ] No hardcoded credentials
[ ] Authentication/authorization correct
[ ] No sensitive data in logs

Pillar 6 — Performance:
[ ] No obvious N+1 query patterns
[ ] No O(n²) or worse where avoidable
[ ] Appropriate caching used

Pillar 7 — DRY:
[ ] No copy-paste duplication
[ ] Proper abstractions for repeated logic

Pillar 8 — Dependencies:
[ ] New dependencies security-scanned
[ ] License compatible
[ ] Versions pinned
```
