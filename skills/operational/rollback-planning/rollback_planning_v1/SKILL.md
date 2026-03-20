---
name: Rollback Planning
description: Safe rollback procedures for deployment failures and critical bugs
version: 1.0.0
tags: [rollback, deployment, incident, recovery]
category: operational
triggers:
  keywords: [rollback, revert, deployment failure]
  modes: [maintenance, incident]
key_components:
  rollback_triggers: "When to rollback (error rate spike, data corruption, critical bug)"
  rollback_steps: "Detailed step-by-step rollback procedure, tested in staging"
  data_rollback_strategy: "Database migrations reversible, data restoration procedure"
  communication_plan: "Who to notify (stakeholders, users, support team)"
  post_rollback_validation: "How to confirm stability, health checks, monitoring"
  root_cause_analysis: "Investigate before re-deploy, fix underlying issue"
rollback_patterns:
  - Blue-green revert
  - Canary rollback
  - Database migration rollback
  - Feature flag disable
when_not_to_use: "Data corruption already occurred (may need forward fix), partial deployments (complex rollback)"
---

# Rollback Planning

## Purpose

Define safe, tested rollback procedures to execute quickly when deployment failures or critical bugs occur. A good rollback plan is written before deployment, not during an incident.

## Key Components

### 1. Rollback Triggers

Define clear, objective criteria for when to rollback:

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Error rate spike | > 2x baseline error rate | Immediate rollback |
| P95 latency degradation | > 3x baseline | Consider rollback |
| Critical functionality broken | Any P1 bug | Immediate rollback |
| Data corruption detected | Any scope | Stop — investigate before rollback |
| Security breach | Any severity | Immediate rollback + escalate |

**Decision rule:** If in doubt and within first 30 minutes of deployment, rollback. It's faster to re-deploy a fix than to debug under production load.

### 2. Rollback Steps

Document the exact procedure BEFORE deploying:

```
Rollback Procedure (template):
1. [ ] Confirm rollback decision with incident commander
2. [ ] Announce in incident channel: "Rolling back to vX.X.X"
3. [ ] Execute rollback command: [specific command]
4. [ ] Monitor deployment completion (est. N minutes)
5. [ ] Verify rollback successful: [specific health check]
6. [ ] Run smoke tests against rolled-back version
7. [ ] Announce rollback complete: "Rolled back to vX.X.X at HH:MM UTC"
```

Steps must be specific, not generic. Test this procedure in staging before production deployment.

### 3. Data Rollback Strategy

Database changes require special handling:

- **Reversible migrations:** Write down/up migrations; rollback runs the down migration automatically.
- **Irreversible migrations (additive):** Data may exist in both old and new format; typically safe to rollback application code without rolling back schema.
- **Destructive migrations (column drops, table drops):** Do NOT drop immediately. Deprecate first, roll back code, then drop in a later release.
- **Data restoration:** If data was written in new format, have a documented procedure to restore from backup or transform data back.

### 4. Communication Plan

Notify the right people at the right time:

| Audience | When | Channel | Message |
|----------|------|---------|---------|
| Engineering team | Immediately when decision made | Incident channel | "Initiating rollback, ETA N min" |
| Product/Stakeholders | Within 5 minutes | Email/Slack | "Deployment issue detected, rolling back" |
| Support team | Within 10 minutes | Support channel | "Issue with latest release, rolling back. May affect users." |
| Users (if impacted) | Within 15 minutes | Status page | "We are experiencing issues and rolling back to a stable version" |

### 5. Post-Rollback Validation

Confirm the system is stable after rollback:

- Run automated smoke tests
- Check error rate returns to pre-deployment baseline
- Verify key user journeys work
- Monitor for 15-30 minutes after rollback completes
- Confirm monitoring alerts are resolved

### 6. Root Cause Analysis

Before re-deploying, understand what went wrong:

- Review deployment logs and error traces
- Identify the specific change that caused the issue
- Write a fix (do NOT re-deploy the same code)
- Run the fix through the standard release readiness checklist
- Consider adding a test to prevent regression

## Rollback Patterns

### Blue-Green Revert

Instantly switch traffic back to the blue environment. No code rollback needed — the old version is still running.

**Best for:** Applications with blue-green deployment infrastructure. Rollback time: < 5 minutes.

### Canary Rollback

Remove the canary instances and redirect all traffic to stable version.

**Best for:** Canary deployments where only a small percentage of traffic was affected.

### Database Migration Rollback

Run `down` migration to reverse schema changes, then rollback application code.

**Best for:** Additive schema changes (new columns, new tables). Avoid for destructive changes.

### Feature Flag Disable

Toggle the feature flag off to hide the broken feature without a deployment.

**Best for:** Features gated behind feature flags. Rollback time: < 1 minute.

## When NOT to Use This Skill

- Data corruption already occurred at scale: rolling back application code may cause more damage. Evaluate a forward fix instead.
- Partial deployments (e.g., half the fleet is on new version): complex rollback. Investigate carefully.
