# Qwen Verification Workflow

**Manual Verification Guide for Qwen Provider**

This guide shows how to verify implementation using Qwen models in EZ Agents.

---

## Overview

The verification workflow ensures implementation matches requirements and meets quality standards using Qwen models optimized for validation tasks.

### Verification Types

| Type | Purpose | Model | Temperature |
|------|---------|-------|-------------|
| Requirements Traceability | Verify requirements implemented | qwen-plus | 0.2 |
| Code Quality Review | Check code standards | qwen-plus | 0.2 |
| Test Coverage | Validate test completeness | qwen-turbo | 0.1 |
| Security Audit | Check security practices | qwen-max | 0.3 |
| Performance Review | Analyze performance | qwen-max | 0.3 |

---

## Pre-Verification Checklist

Before starting verification:

```bash
# 1. Ensure execution is complete
ez-agents validate-phase "2"

# 2. Check all tests pass
npm test

# 3. Verify build succeeds
npm run build

# 4. Run linter
npm run lint

# 5. Check coverage
npm run coverage
```

---

## Verification Steps

### Step 1: Create Verification Plan

Create `.planning/phases/03-verification/01-PLAN.md`:

```markdown
---
phase: 03
plan: 01
type: verification
wave: 1
depends_on: ["02-01"]
files_modified:
  - tests/verification-report.md
autonomous: false
must_haves:
  artifacts:
    - path: tests/verification-report.md
      min_lines: 100
      contains: "requirements traceability"
    - path: tests/code-review.md
      min_lines: 50
  key_links:
    - from: tests/verification-report.md
      to: .planning/REQUIREMENTS.md
      via: "REQ-\\d+"
---

# Phase 3: Verification & Quality Assurance

## Objective

Comprehensive verification of implementation against requirements.

## Tasks

<task>
  <name>Requirements Traceability Matrix</name>
  <action>
    Use Qwen-Plus to create traceability matrix:
    1. List all requirements from REQUIREMENTS.md
    2. Map each requirement to implementation
    3. Identify gaps
    4. Document verification status
  </action>
  <verify>
    - Every requirement has implementation link
    - Gaps documented with remediation plan
    - Status clearly marked (Pass/Fail/Partial)
  </verify>
  <done>
    Traceability matrix complete and reviewed
  </done>
  <files>
    - tests/traceability-matrix.md
    - .planning/REQUIREMENTS.md (updated)
  </files>
  <model>qwen-plus</model>
  <temperature>0.2</temperature>
  <max_tokens>4096</max_tokens>
</task>

<task>
  <name>Code Quality Review</name>
  <action>
    Use Qwen-Plus to review code quality:
    1. Check coding standards compliance
    2. Identify code smells
    3. Review error handling
    4. Check documentation completeness
  </action>
  <verify>
    - Code review report generated
    - Issues categorized by severity
    - Remediation suggestions provided
  </verify>
  <done>
    Code review complete with action items
  </done>
  <files>
    - tests/code-review-report.md
  </files>
  <model>qwen-plus</model>
  <temperature>0.2</temperature>
  <max_tokens>8192</max_tokens>
</task>

<task>
  <name>Test Coverage Analysis</name>
  <action>
    Use Qwen-Turbo to analyze test coverage:
    1. Run coverage report
    2. Identify uncovered code
    3. Suggest additional tests
    4. Verify coverage threshold met
  </action>
  <verify>
    - Coverage report generated
    - Coverage > 80%
    - Critical paths fully covered
  </verify>
  <done>
    Test coverage verified and documented
  </done>
  <files>
    - tests/coverage-analysis.md
    - coverage/lcov-report/index.html
  </files>
  <model>qwen-turbo</model>
  <temperature>0.1</temperature>
  <max_tokens>2048</max_tokens>
</task>

<task>
  <name>Security Audit</name>
  <action>
    Use Qwen-Max to perform security audit:
    1. Check for common vulnerabilities
    2. Review authentication/authorization
    3. Validate input sanitization
    4. Check secret management
  </action>
  <verify>
    - Security audit report generated
    - Vulnerabilities categorized (Critical/High/Medium/Low)
    - Remediation plan created
  </verify>
  <done>
    Security audit complete
  </done>
  <files>
    - tests/security-audit.md
  </files>
  <model>qwen-max</model>
  <temperature>0.3</temperature>
  <max_tokens>8192</max_tokens>
</task>

## Success Criteria

1. ✅ All requirements traced (100% coverage)
2. ✅ Code review completed with no critical issues
3. ✅ Test coverage > 80%
4. ✅ Security audit passed (no critical vulnerabilities)

## Model Configuration

```json
{
  "verification": {
    "traceability": {
      "model": "qwen-plus",
      "temperature": 0.2
    },
    "code_quality": {
      "model": "qwen-plus",
      "temperature": 0.2
    },
    "test_coverage": {
      "model": "qwen-turbo",
      "temperature": 0.1
    },
    "security": {
      "model": "qwen-max",
      "temperature": 0.3
    }
  }
}
```
```

### Step 2: Execute Verification

```bash
# Run verification
ez-agents verify-work "2"

# Or manually
node ez-agents/bin/ez-tools.cjs init verify-work "2"
```

### Step 3: Review Verification Results

#### Requirements Traceability

Check `tests/traceability-matrix.md`:

```markdown
# Requirements Traceability Matrix

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| Pass | 18 | 90% |
| Partial | 2 | 10% |
| Fail | 0 | 0% |
| **Total** | **20** | **100%** |

## Detailed Traceability

### REQ-001: User Registration
**Status:** ✅ Pass

**Implementation:**
- `src/routes/auth.js` - Registration endpoint
- `src/controllers/auth.js` - Registration logic
- `src/models/user.js` - User model

**Tests:**
- `tests/auth.test.js` - Test cases 1-15

**Verification:**
- User can register with valid email/password ✓
- Password is hashed with bcrypt ✓
- Email validation implemented ✓
- Duplicate email rejected ✓

---

### REQ-002: User Login
**Status:** ✅ Pass

**Implementation:**
- `src/routes/auth.js` - Login endpoint
- `src/middleware/auth.js` - JWT middleware

**Tests:**
- `tests/auth.test.js` - Test cases 16-30

**Verification:**
- User can login with valid credentials ✓
- JWT token returned ✓
- Token expiration implemented ✓
- Invalid credentials rejected ✓

---

### REQ-003: Password Reset
**Status:** ⚠️ Partial

**Implementation:**
- `src/routes/auth.js` - Reset request endpoint
- ❌ Missing: Reset token generation
- ❌ Missing: Email sending

**Tests:**
- ❌ No tests implemented yet

**Gaps:**
1. Reset token generation not implemented
2. Email service not integrated
3. No tests written

**Remediation Plan:**
- Phase 4: Implement password reset flow
- Add email service integration
- Write comprehensive tests

**ETA:** Sprint 2
```

#### Code Quality Review

Check `tests/code-review-report.md`:

```markdown
# Code Quality Review Report

## Summary

| Metric | Score | Status |
|--------|-------|--------|
| Overall Quality | 8.5/10 | ✅ Good |
| Code Style | 9/10 | ✅ Excellent |
| Error Handling | 8/10 | ✅ Good |
| Documentation | 7/10 | ⚠️ Needs Work |
| Test Coverage | 92% | ✅ Excellent |

## Issues by Severity

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | ✅ None |
| High | 2 | 🔧 In Progress |
| Medium | 5 | 📋 Planned |
| Low | 12 | 📝 Backlog |

## Critical Issues

None

## High Priority Issues

### Issue #1: Missing Error Handling in Database Queries
**Location:** `src/database/queries.js:45`

**Problem:**
```javascript
// Current code
const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
return user;
```

**Recommendation:**
```javascript
// Fixed code
try {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
} catch (error) {
  logger.error('Database query failed', { error, id });
  throw error;
}
```

**Priority:** High
**Effort:** Low

### Issue #2: Inconsistent Error Response Format
**Location:** Multiple controllers

**Problem:** Error responses use different formats across controllers.

**Recommendation:** Create centralized error response formatter.

**Priority:** High
**Effort:** Medium

## Medium Priority Issues

1. Missing JSDoc comments in utility functions
2. Inconsistent variable naming (camelCase vs snake_case)
3. Magic numbers in business logic
4. Missing input validation in 3 endpoints
5. No rate limiting on auth endpoints

## Low Priority Issues

1. Console.log statements in production code (5 instances)
2. Missing .gitignore entries
3. Outdated comments
4. Unused imports (3 files)
5. Long functions (>50 lines) in 2 modules

## Positive Findings

✅ Excellent test coverage (92%)
✅ Consistent code style
✅ Good separation of concerns
✅ Proper use of async/await
✅ Environment variables for config
```

### Step 4: Create Verification Summary

Create `.planning/phases/03-verification/01-SUMMARY.md`:

```markdown
# Summary 03-01: Verification Results

## Verification Overview

**Phase Verified:** 02 (Foundation)
**Verification Date:** 2026-03-18
**Verifier:** Qwen-Plus, Qwen-Max, Qwen-Turbo
**Overall Status:** ✅ PASS with recommendations

## Verification Results

### 1. Requirements Traceability

**Status:** ✅ PASS (90% implemented, 10% partial)

**Summary:**
- Total Requirements: 20
- Fully Implemented: 18 (90%)
- Partially Implemented: 2 (10%)
- Not Implemented: 0 (0%)

**Gaps Identified:**
- REQ-003 (Password Reset): Partial - needs email integration
- REQ-007 (Email Notifications): Partial - needs template system

**Remediation:** Planned for Phase 4

### 2. Code Quality Review

**Status:** ✅ PASS (Score: 8.5/10)

**Metrics:**
- Code Style: 9/10
- Error Handling: 8/10
- Documentation: 7/10
- Test Coverage: 92%

**Issues:**
- Critical: 0
- High: 2 (in progress)
- Medium: 5 (planned)
- Low: 12 (backlog)

**No blockers for release.**

### 3. Test Coverage

**Status:** ✅ PASS (92% coverage)

**Breakdown:**
- Statements: 92%
- Branches: 89%
- Functions: 95%
- Lines: 93%

**Threshold:** 80% ✅

**Critical Paths:**
- Authentication: 100% ✅
- Authorization: 100% ✅
- Database Operations: 95% ✅
- API Endpoints: 90% ✅

### 4. Security Audit

**Status:** ✅ PASS (No critical vulnerabilities)

**Findings:**
- Critical: 0
- High: 1 (password strength validation)
- Medium: 3 (rate limiting, input validation, logging)
- Low: 5 (headers, CORS, etc.)

**Recommendations:**
1. Add password strength requirements
2. Implement rate limiting on auth endpoints
3. Add input validation middleware
4. Enhance security headers

## Commits

Verification commits:
- `vrf1234` - Add traceability matrix
- `vrf5678` - Code quality review report
- `vrf9012` - Test coverage analysis
- `vrf3456` - Security audit report

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| tests/traceability-matrix.md | 250 | Requirements mapping |
| tests/code-review-report.md | 180 | Quality review |
| tests/coverage-analysis.md | 120 | Coverage report |
| tests/security-audit.md | 200 | Security findings |

**Total:** 750 lines of verification documentation

## Self-Check

✅ Requirements traceability complete
✅ Code quality review done
✅ Test coverage verified (>80%)
✅ Security audit passed
✅ Documentation complete
✅ Issues documented with remediation plans

## Recommendations

### Before Release
1. Fix 2 high-priority code quality issues
2. Implement password strength validation
3. Add rate limiting to auth endpoints

### Future Phases
1. Complete REQ-003 (Password Reset)
2. Complete REQ-007 (Email Notifications)
3. Address medium-priority code quality issues
4. Improve JSDoc coverage

## Sign-Off

**Verified By:** EZ Agents Verification System
**Date:** 2026-03-18
**Status:** ✅ APPROVED FOR RELEASE

---

## Appendix: Verification Commands

```bash
# Run all tests
npm test

# Check coverage
npm run coverage

# Run linter
npm run lint

# Security audit
npm audit

# Build verification
npm run build
```
```

### Step 5: Update Requirements

Update `.planning/REQUIREMENTS.md`:

```markdown
# Requirements Traceability

| ID | Requirement | Phase | Status | Notes |
|----|-------------|-------|--------|-------|
| REQ-001 | User Registration | 2 | ✅ Complete | Fully implemented and tested |
| REQ-002 | User Login | 2 | ✅ Complete | JWT-based auth working |
| REQ-003 | Password Reset | 2 | ⚠️ Partial | Backend ready, email pending |
| REQ-004 | User Profile | 2 | ✅ Complete | CRUD operations complete |
| REQ-005 | Data Validation | 2 | ✅ Complete | All inputs validated |
| ... | ... | ... | ... | ... |
```

---

## Verification Checklist

Use this checklist for thorough verification:

```markdown
# Verification Checklist

## Requirements
- [ ] All requirements traced to implementation
- [ ] Gaps documented with remediation plan
- [ ] Stakeholders reviewed traceability matrix

## Code Quality
- [ ] Code style consistent
- [ ] Error handling comprehensive
- [ ] Documentation complete
- [ ] No critical code quality issues

## Testing
- [ ] Unit tests written for all modules
- [ ] Integration tests for critical paths
- [ ] Test coverage > 80%
- [ ] All tests passing

## Security
- [ ] No critical vulnerabilities
- [ ] Authentication implemented correctly
- [ ] Authorization enforced
- [ ] Input validation in place
- [ ] Secrets managed securely

## Performance
- [ ] No obvious performance issues
- [ ] Database queries optimized
- [ ] Caching strategy defined
- [ ] Load testing planned

## Documentation
- [ ] README complete
- [ ] API documentation current
- [ ] Code comments helpful
- [ ] Changelog updated

## Deployment
- [ ] Build process documented
- [ ] Deployment steps clear
- [ ] Rollback plan exists
- [ ] Monitoring configured
```

---

## Model Configuration

### Standard Verification

```json
{
  "provider": "qwen",
  "model": "qwen-plus",
  "temperature": 0.2,
  "max_tokens": 4096,
  "top_p": 0.8
}
```

### Security Audit

```json
{
  "provider": "qwen",
  "model": "qwen-max",
  "temperature": 0.3,
  "max_tokens": 8192
}
```

### Quick Checks

```json
{
  "provider": "qwen",
  "model": "qwen-turbo",
  "temperature": 0.1,
  "max_tokens": 2048
}
```

---

## Troubleshooting

### Issue: Requirements Gaps

**Solution:**
1. Document gap in traceability matrix
2. Create remediation plan
3. Schedule for future phase
4. Update roadmap

### Issue: Low Test Coverage

**Solution:**
1. Identify uncovered code
2. Write targeted tests
3. Use Qwen to generate test cases
4. Re-run coverage report

### Issue: Security Vulnerabilities

**Solution:**
1. Prioritize by severity
2. Fix critical/high immediately
3. Document medium/low
4. Schedule remediation

---

## Best Practices

1. **Verify Early** - Don't wait until end
2. **Use Right Model** - qwen-max for security, qwen-turbo for quick checks
3. **Document Everything** - Create comprehensive reports
4. **Track Gaps** - Always document what's missing
5. **Get Sign-Off** - Formal approval before release

---

## Next Steps

- [Planning Workflow](QWEN-PLANNING.md) - Planning reference
- [Execution Workflow](QWEN-EXECUTION.md) - Execution guide
- [Provider Guide](QWEN-PROVIDER.md) - Complete documentation
