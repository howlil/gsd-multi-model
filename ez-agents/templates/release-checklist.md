# Release Checklist Template

Tier-parameterized checklist for `/ez:release`. Items marked `[AUTO]` can be checked programmatically. Items marked `[HUMAN]` require manual verification.

---

## MVP Checklist (9 items)

Use when: First public release, early access, startup MVP

```
Release: v{version} — MVP Tier
Date: {date}
```

| # | Item | Type | Result |
|---|------|------|--------|
| 1 | All @must BDD scenarios passing | AUTO | |
| 2 | `npm audit` — no critical vulnerabilities | AUTO | |
| 3 | Health endpoint returns 200 (if applicable) | AUTO | |
| 4 | No secrets in committed files | AUTO | |
| 5 | Application starts without errors (`npm start` or equivalent) | AUTO | |
| 6 | Rollback procedure documented | AUTO | |
| 7 | Baseline security scan completed | AUTO | |
| 8 | Audit logging enabled for security-sensitive actions | AUTO | |
| 9 | Required compliance checklist/evidence files present | HUMAN | |

**Gate:** All 9 items must pass for MVP release.

---

## Medium Checklist (21 items)

Use when: General availability, paying customers, production SLA

```
Release: v{version} — Medium Tier
Date: {date}
```

*Includes all MVP items plus:*

| # | Item | Type | Result |
|---|------|------|--------|
| 1-9 | All MVP items | AUTO | |
| 10 | All @should BDD scenarios passing | AUTO | |
| 11 | Test coverage ≥ 80% | AUTO | |
| 12 | Staging environment parity verified | HUMAN | |
| 13 | Monitoring/alerts configured (uptime, error rate) | HUMAN | |
| 14 | Structured logging in place (no console.log in prod) | AUTO | |
| 15 | Performance baseline documented | HUMAN | |
| 16 | Error tracking configured (Sentry, Rollbar, or equivalent) | HUMAN | |
| 17 | Database migrations tested on staging copy | HUMAN | |
| 18 | API documentation current (README or OpenAPI) | HUMAN | |
| 19 | Environment variables documented (.env.example up to date) | AUTO | |
| 20 | Graceful shutdown handled (SIGTERM, connection draining) | AUTO | |
| 21 | Rate limiting on public API endpoints | AUTO | |

**Gate:** Items 1-15 must pass. Items 16-21 advisory for Medium.

---

## Enterprise Checklist (30 items)

Use when: Enterprise customers, regulated industries, compliance requirements

```
Release: v{version} — Enterprise Tier
Date: {date}
```

*Includes all Medium items plus:*

| # | Item | Type | Result |
|---|------|------|--------|
| 1-18 | All Medium items | MIXED | |
| 19 | All @could BDD scenarios passing | AUTO | |
| 20 | Test coverage ≥ 95% | AUTO | |
| 21 | Security audit completed (internal or third-party) | HUMAN | |
| 22 | Compliance documentation updated (SOC2/GDPR controls) | HUMAN | |
| 23 | Load test results documented (target: 2x expected peak) | HUMAN | |
| 24 | Disaster recovery tested (backup restore procedure) | HUMAN | |
| 25 | Data retention policy configured | HUMAN | |
| 26 | Audit logging enabled (who did what, when) | AUTO | |
| 27 | Penetration test completed or scheduled | HUMAN | |
| 28 | SOC2/GDPR controls validated | HUMAN | |
| 29 | Change management ticket filed | HUMAN | |
| 30 | Incident runbook up to date | HUMAN | |

**Gate:** All items 1-26 must pass. Items 27-30 must be scheduled/documented.

---

## Security Gates (All Tiers)

These run before ANY release regardless of tier:

```bash
# Gate 1: No secrets
git grep -i -E "(api[_-]?key|password|secret)['\"]?\s*[=:]\s*['\"]?[a-zA-Z0-9+/]{20,}" HEAD

# Gate 2: npm audit
npm audit --audit-level=critical

# Gate 3: Production TODO/FIXME
grep -rn "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.js" | grep -v test

# Gate 4: .env protected
grep -q "^\.env" .gitignore
```

**Any gate failure = BLOCKED regardless of tier.**

---

## Production Readiness Score

```
Score = 100 - (blocking_failures × 10) - (advisory_failures × 2)

READY:        90-100
CONDITIONAL:  70-89
NOT READY:    <70
```

---

## Rollback Criteria

**Roll back immediately if (within 1 hour of release):**

| Tier | Trigger | Response Time |
|------|---------|---------------|
| MVP | App won't start OR error rate >20% | 30 minutes |
| Medium | Error rate >5% above baseline OR P95 >500ms increase | 15 minutes |
| Enterprise | Any SLA breach OR compliance violation | 5 minutes |
