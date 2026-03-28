---
workflow: security-review
version: 1.0.0
last_updated: 2026-03-29
description: Comprehensive security audit for authentication, input validation, and secrets management
tags: [security, audit, compliance]
---

<objective>
Conduct systematic security audit to identify vulnerabilities before production release.

**Outcomes:**
1. Authentication flows audited for common vulnerabilities
2. Input validation reviewed across all user-facing endpoints
3. Secrets management assessed (env vars, API keys, tokens)
4. Security report generated with findings and remediation plans
5. Critical issues added to ROADMAP as urgent refactor phases

**Strategy:** Defense in depth — assume breach, verify every trust boundary.
</objective>

<execution_context>
@~/.qwen/ez-agents/references/verification-patterns.md
@~/.qwen/ez-agents/references/git-strategy.md
@~/.qwen/ez-agents/templates/security-user-setup.md
@~/.qwen/ez-agents/agents/ez-debugger.md
@~/.qwen/ez-agents/agents/ez-verifier.md
</execution_context>

<process>

## Step 1: Initialize Security Audit

**Action:** Set up security audit context and scope.

```bash
# Initialize
INIT=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" init milestone-op)
if [[ "$INIT" != *"success"* ]]; then
  echo "Failed to initialize"
  exit 1
fi

# Create security audit directory
mkdir -p .planning/security
```

**Success criteria:** Audit directory created.

---

## Step 2: Map Trust Boundaries

**Action:** Identify all trust boundaries in the application.

**Spawn ez-debugger (Security Analysis):**

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
  --agent="ez-debugger" \
  --model="opus" \
  --prompt="
Map all trust boundaries in this codebase.

**Analyze:**
1. **Authentication boundaries** — Where unauthenticated becomes authenticated
2. **Authorization boundaries** — Role/permission checks
3. **Input boundaries** — API endpoints, form handlers, file uploads
4. **Data boundaries** — Database queries, external API calls
5. **Network boundaries** — CORS, CSRF, SSL/TLS termination

**Files to examine:**
- src/app/api/** (API routes)
- src/components/** (User input forms)
- src/lib/auth/** (Authentication logic)
- src/middleware/** (Request validation)
- *.env.example (Environment configuration)

**Output format (JSON):**
{
  \"trust_boundaries\": [
    {
      \"type\": \"auth|input|data|network\",
      \"location\": \"file:path\",
      \"description\": \"What this boundary protects\",
      \"current_controls\": [\"Existing security measures\"],
      \"threat_model\": \"What could go wrong\"
    }
  ]
}

Be thorough — missing a boundary is a security risk.
"
```

**Save trust boundary map:**

```bash
echo "$DEBUGGER_OUTPUT" > .planning/security/trust-boundaries.json
```

**Success criteria:** All trust boundaries documented.

---

## Step 3: Authentication Audit

**Action:** Review authentication implementation.

**Checklist:**

```bash
# Check for common auth vulnerabilities
cat << 'EOF' > .planning/security/auth-checklist.md
# Authentication Security Checklist

## Token Management
- [ ] JWT tokens have reasonable expiry (< 24h for access tokens)
- [ ] Refresh tokens rotate on use
- [ ] Tokens stored securely (httpOnly cookies, not localStorage)
- [ ] Token validation on every protected route

## Session Security
- [ ] Session IDs are cryptographically random
- [ ] Sessions expire after inactivity
- [ ] Session fixation protection implemented
- [ ] Concurrent session limits (if applicable)

## Password Security
- [ ] Passwords hashed with bcrypt/argon2 (not MD5/SHA)
- [ ] Minimum password strength enforced
- [ ] Rate limiting on login attempts
- [ ] No password in error messages

## OAuth/SSO
- [ ] State parameter used (CSRF protection)
- [ ] Redirect URIs validated (open redirect prevention)
- [ ] Scope validation
- [ ] Token exchange secure

## Multi-Factor Authentication
- [ ] MFA available for sensitive operations
- [ ] TOTP implementation follows RFC 6238
- [ ] Backup codes provided
- [ ] MFA bypass prevention
EOF
```

**Spawn ez-verifier (Auth Audit):**

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
  --agent="ez-verifier" \
  --model="sonnet" \
  --prompt="
Audit authentication implementation against the security checklist.

Checklist: $(cat .planning/security/auth-checklist.md)

Codebase files:
$(find src -name "*auth*" -o -name "*session*" -o -name "*login*" -o -name "*token*" 2>/dev/null)

**For each checklist item:**
1. **Status:** pass/fail/partial
2. **Evidence:** Code references or missing implementation
3. **Risk:** low/medium/high/critical
4. **Remediation:** How to fix if failing

**Output format (JSON):**
{
  \"audit_results\": {
    \"token_management\": [...],
    \"session_security\": [...],
    \"password_security\": [...],
    \"oauth_sso\": [...],
    \"mfa\": [...]
  },
  \"critical_issues\": [...],
  \"high_issues\": [...],
  \"summary\": \"Overall security posture\"
}
"
```

**Save auth audit:**

```bash
echo "$VERIFIER_OUTPUT" > .planning/security/auth-audit.json
```

**Success criteria:** All auth vulnerabilities identified.

---

## Step 4: Input Validation Audit

**Action:** Review input validation across all user-facing endpoints.

**Spawn ez-verifier (Input Validation):**

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
  --agent="ez-verifier" \
  --model="sonnet" \
  --prompt="
Audit input validation for SQL injection, XSS, and injection attacks.

**Examine:**
1. **API endpoints** — src/app/api/**/route.ts
2. **Form handlers** — React components with forms
3. **Database queries** — Prisma, raw SQL
4. **File uploads** — Upload handlers
5. **URL parameters** — Dynamic route handlers

**Check for:**
- **SQL Injection** — Parameterized queries, ORM usage
- **XSS** — Output encoding, CSP headers, dangerous HTML
- **Command Injection** — Shell commands with user input
- **Path Traversal** — File path validation
- **SSRF** — URL validation for external requests
- **Deserialization** — JSON.parse safety, prototype pollution

**Output format (JSON):**
{
  \"validation_results\": [
    {
      \"location\": \"file:path\",
      \"input_type\": \"api|form|file|url\",
      \"vulnerabilities\": [
        {
          \"type\": \"sql_injection|xss|command_injection|path_traversal|ssrf\",
          \"severity\": \"critical|high|medium|low\",
          \"description\": \"What's vulnerable\",
          \"exploit_scenario\": \"How attacker could exploit\",
          \"fix\": \"How to remediate\"
        }
      ],
      \"safe_practices\": [\"What's done correctly\"]
    }
  ]
}
"
```

**Save input validation audit:**

```bash
echo "$VERIFIER_OUTPUT" > .planning/security/input-validation-audit.json
```

**Success criteria:** All input vulnerabilities identified.

---

## Step 5: Secrets Management Audit

**Action:** Review how secrets are stored and accessed.

**Checklist:**

```bash
# Check for exposed secrets
echo "Scanning for exposed secrets..."

# Check .env files not gitignored
if git ls-files .env .env.local .env.production 2>/dev/null | grep -q .; then
  echo "⚠️  WARNING: .env files may be committed to git"
fi

# Check for hardcoded secrets in code
HARDCODED_SECRETS=$(grep -rE "(api_key|apikey|secret|password|token)\s*[=:]\s*['\"][^'\"]{8,}['\"]" src/ 2>/dev/null || true)

if [ -n "$HARDCODED_SECRETS" ]; then
  echo "⚠️  WARNING: Potential hardcoded secrets found"
  echo "$HARDCODED_SECRETS" > .planning/security/hardcoded-secrets.txt
fi

# Check .env.example for sensitive defaults
if grep -qE "^(SECRET_KEY|API_KEY|PRIVATE_KEY)=" .env.example 2>/dev/null; then
  echo "⚠️  WARNING: .env.example contains sensitive defaults"
fi
```

**Spawn ez-debugger (Secrets Audit):**

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
  --agent="ez-debugger" \
  --model="sonnet" \
  --prompt="
Audit secrets management implementation.

**Review:**
1. **Environment variables** — .env, .env.example, process.env usage
2. **Secret injection** — How secrets reach the application
3. **Secret storage** — Vault, AWS Secrets Manager, etc.
4. **Secret rotation** — Key rotation procedures
5. **Secret logging** — Ensure secrets not in logs

**Checklist:**
- [ ] No secrets in source code
- [ ] No secrets in client-side code
- [ ] .env files gitignored
- [ ] .env.example has placeholder values
- [ ] Secrets encrypted at rest
- [ ] Secrets encrypted in transit
- [ ] Access logging for secret retrieval
- [ ] Principle of least privilege applied

**Output format (JSON):**
{
  \"secrets_audit\": {
    \"environment_variables\": {\"status\": \"pass/fail\", \"issues\": []},
    \"secret_injection\": {\"status\": \"pass/fail\", \"issues\": []},
    \"secret_storage\": {\"status\": \"pass/fail\", \"issues\": []},
    \"secret_rotation\": {\"status\": \"pass/fail\", \"issues\": []},
    \"secret_logging\": {\"status\": \"pass/fail\", \"issues\": []}
  },
  \"exposed_secrets\": [...],
  \"recommendations\": [...]
}
"
```

**Save secrets audit:**

```bash
echo "$DEBUGGER_OUTPUT" > .planning/security/secrets-audit.json
```

**Success criteria:** All secrets management issues identified.

---

## Step 6: Generate Security Report

**Action:** Consolidate all findings into comprehensive report.

**Spawn ez-debugger (Report Generation):**

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
  --agent="ez-debugger" \
  --model="opus" \
  --prompt="
Generate comprehensive security audit report.

**Input:**
- Trust boundaries: $(cat .planning/security/trust-boundaries.json)
- Auth audit: $(cat .planning/security/auth-audit.json)
- Input validation: $(cat .planning/security/input-validation-audit.json)
- Secrets audit: $(cat .planning/security/secrets-audit.json)

**Report Structure:**

# Security Audit Report

**Date:** $(date -u +"%Y-%m-%d")
**Scope:** Full application security review
**Auditor:** EZ Agents Security Workflow

## Executive Summary

Brief overview of security posture, critical findings count.

## Trust Boundary Analysis

Map of all security boundaries and their controls.

## Authentication Audit

Findings from authentication review.

### Critical Issues
### High Issues
### Medium Issues
### Recommendations

## Input Validation Audit

Findings from input validation review.

### SQL Injection Risks
### XSS Risks
### Other Injection Risks
### Recommendations

## Secrets Management Audit

Findings from secrets review.

### Exposed Secrets
### Storage Issues
### Recommendations

## Remediation Roadmap

Prioritized list of fixes:

### Immediate (24-48 hours)
- Critical vulnerabilities only

### Short-term (1-2 weeks)
- High severity issues

### Medium-term (1 month)
- Medium severity improvements

### Long-term (quarterly)
- Security hardening, best practices

## Appendix

- Files reviewed
- Tools used
- Methodology
"
```

**Save security report:**

```bash
echo "$DEBUGGER_OUTPUT" > .planning/security/SECURITY_AUDIT.md
```

**Success criteria:** Comprehensive report generated.

---

## Step 7: Create Remediation Plans

**Action:** Generate actionable remediation tasks for critical/high issues.

```bash
# Extract critical and high issues
CRITICAL_ISSUES=$(cat .planning/security/auth-audit.json .planning/security/input-validation-audit.json .planning/security/secrets-audit.json | \
  jq -s '[.[].critical_issues // [], .[].high_issues // []] | flatten')

# Count issues
CRITICAL_COUNT=$(echo "$CRITICAL_ISSUES" | jq 'length')

if [ "$CRITICAL_COUNT" -gt 0 ]; then
  echo "Found $CRITICAL_COUNT critical/high issues requiring remediation"
  
  # Create remediation plan for each critical issue
  echo "$CRITICAL_ISSUES" | jq -r '.[] | @base64' | while read -r issue_b64; do
    _jq() {
      echo "${issue_b64}" | base64 --decode | jq -r "${1}"
    }
    
    ISSUE_TYPE=$(_jq '.type')
    SEVERITY=$(_jq '.severity')
    LOCATION=$(_jq '.location')
    DESCRIPTION=$(_jq '.description')
    FIX=$(_jq '.fix')
    
    # Create remediation task file
    cat > ".planning/security/remediation-${ISSUE_TYPE}.md" << EOF
# Remediation: $ISSUE_TYPE

**Severity:** $SEVERITY
**Location:** $LOCATION
**Description:** $DESCRIPTION

## Fix

$FIX

## Verification

- [ ] Fix implemented
- [ ] Tests added/updated
- [ ] Security review passed
- [ ] Deployed to staging
- [ ] Verified in production
EOF
  done
fi
```

**Success criteria:** Remediation plans for all critical/high issues.

---

## Step 8: Update ROADMAP for Critical Issues

**Action:** Add urgent security phases to roadmap.

```bash
if [ "$CRITICAL_COUNT" -gt 0 ]; then
  # Spawn ez-roadmapper to add security phases
  node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
    --agent="ez-roadmapper" \
    --model="opus" \
    --prompt="
Add urgent security remediation phases to ROADMAP.md.

Current ROADMAP:
$(cat .planning/ROADMAP.md)

Critical security issues:
$CRITICAL_ISSUES

**Action:**
1. Add security phases as decimal phases after current phase
2. Label as SECURITY CRITICAL
3. Include remediation plan references

Example:

## Phase 06.1: Security Remediation — Authentication

**Priority:** CRITICAL

**Goal:** Fix authentication vulnerabilities before production

**Issues:**
- [Issue 1]
- [Issue 2]

**Plan:** .planning/security/remediation-auth.md

**Success:** All critical auth issues resolved

**Output:** Updated ROADMAP.md
"
  
  echo "$ROADMAPPER_OUTPUT" > .planning/ROADMAP.md
fi
```

**Success criteria:** Critical security work in roadmap.

---

## Step 9: Commit Security Audit

**Action:** Commit all security artifacts.

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" commit \
  "docs: security audit report and remediation plans" \
  --files .planning/security/
```

**Commit message:**
```
docs: security audit report and remediation plans

Audit completed: $(date -u +"%Y-%m-%d")
Critical issues: $CRITICAL_COUNT
Remediation plans: $(ls -1 .planning/security/remediation-*.md 2>/dev/null | wc -l | tr -d ' ')

Security report: .planning/security/SECURITY_AUDIT.md
```

**Success criteria:** All artifacts committed.

---

## Step 10: Display Security Summary

```bash
cat << 'EOF'

╔═══════════════════════════════════════════════════════╗
║  SECURITY AUDIT COMPLETE                              ║
╚═══════════════════════════════════════════════════════╝

Audit Summary:
- Trust boundaries mapped: $(cat .planning/security/trust-boundaries.json | jq '.trust_boundaries | length')
- Critical issues: $(echo "$CRITICAL_ISSUES" | jq '[.[] | select(.severity == "critical")] | length')
- High issues: $(echo "$CRITICAL_ISSUES" | jq '[.[] | select(.severity == "high")] | length')
- Medium issues: $(echo "$CRITICAL_ISSUES" | jq '[.[] | select(.severity == "medium")] | length')

Artifacts:
- Security report: .planning/security/SECURITY_AUDIT.md
- Trust boundaries: .planning/security/trust-boundaries.json
- Auth audit: .planning/security/auth-audit.json
- Input validation: .planning/security/input-validation-audit.json
- Secrets audit: .planning/security/secrets-audit.json
- Remediation plans: .planning/security/remediation-*.md

EOF

if [ "$CRITICAL_COUNT" -gt 0 ]; then
  cat << 'EOF'
⚠️  CRITICAL ISSUES FOUND — Immediate action required

Review .planning/security/SECURITY_AUDIT.md
Critical issues added to ROADMAP as urgent phases
Begin remediation before any production release

EOF
fi
```

**Success criteria:** Clear summary with action items.

</process>

<files_to_read>
src/app/api/**
src/components/**
src/lib/auth/**
src/middleware/**
.env.example
</files_to_read>

<files_to_edit>
.planning/security/SECURITY_AUDIT.md
.planning/security/trust-boundaries.json
.planning/security/auth-audit.json
.planning/security/input-validation-audit.json
.planning/security/secrets-audit.json
.planning/security/remediation-*.md
.planning/ROADMAP.md
</files_to_edit>

<verify>
1. All trust boundaries mapped
2. Authentication audit complete
3. Input validation audit complete
4. Secrets management audit complete
5. Security report generated
6. Remediation plans created for critical/high issues
7. Critical issues added to ROADMAP
8. All artifacts committed
</verify>

<success_criteria>
- **Complete coverage:** All trust boundaries audited
- **Actionable findings:** Each issue has clear remediation
- **Prioritized:** Critical issues identified and escalated
- **Documented:** Comprehensive security report
- **Tracked:** Critical issues in ROADMAP
</success_criteria>
