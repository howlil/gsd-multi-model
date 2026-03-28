---
workflow: rollback
version: 1.0.0
last_updated: 2026-03-29
description: Execute rollback plans from release.md for production incidents
tags: [rollback, incident, production]
---

<objective>
Execute production rollback safely and quickly when deployments cause critical issues.

**Outcomes:**
1. Rollback decision confirmed with stakeholders
2. Previous stable version identified
3. Rollback executed with minimal downtime
4. Post-rollback verification completed
5. Incident report initiated

**Strategy:** Speed with safety — rollback fast but verify at each step.
</objective>

<execution_context>
@~/.qwen/ez-agents/workflows/transition.md
@~/.qwen/ez-agents/references/git-strategy.md
@~/.qwen/ez-agents/templates/incident-runbook.md
@~/.qwen/ez-agents/templates/rollback-plan.md
@~/.qwen/ez-agents/agents/ez-release-agent.md
</execution_context>

<process>

## Step 1: Confirm Rollback Decision

**Action:** Verify rollback is necessary and authorized.

```bash
# Create incident directory
mkdir -p .planning/incidents
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
INCIDENT_DIR=".planning/incidents/incident-${TIMESTAMP}"
mkdir -p "$INCIDENT_DIR"

# Rollback decision checklist
cat > "$INCIDENT_DIR/rollback-checklist.md" << 'EOF'
# Rollback Decision Checklist

## Incident Details
- **Time detected:** 
- **Detected by:** 
- **Severity:** P0 (Critical) / P1 (High) / P2 (Medium)

## Impact Assessment
- [ ] User-facing errors (>1% of requests)
- [ ] Data corruption risk
- [ ] Security vulnerability exposed
- [ ] Service outage
- [ ] Performance degradation (>50% slowdown)

## Alternatives Considered
- [ ] Hotfix (if fix < 30 minutes)
- [ ] Feature flag disable
- [ ] Configuration change
- [ ] Scale up resources

## Rollback Authorization
- [ ] Engineering lead notified
- [ ] Product/PM notified (if user-facing)
- [ ] Customer support notified (if user impact)
- [ ] Rollback approved by: _______________

## Go/No-Go Decision
**Decision:** ROLLBACK / HOLD / FIX-FORWARD

**Rationale:**

**Authorized by:** _______________
**Time:** _______________
EOF

echo "Rollback checklist created: $INCIDENT_DIR/rollback-checklist.md"
echo "Complete the checklist and confirm rollback decision before proceeding."
```

**Checkpoint: Decision Required**

```xml
<task type="checkpoint:decision" gate="blocking">
  <decision>Confirm rollback decision</decision>
  <context>
    Production incident detected. Rollback checklist prepared.
    
    **Incident:** [Describe the issue]
    **Impact:** [User impact assessment]
    **Alternatives:** [Why rollback vs hotfix]
  </context>
  <options>
    <option id="rollback">
      <name>Execute Rollback</name>
      <pros>Fast recovery, restore service immediately</pros>
      <cons>Loses recent features, may need data migration</cons>
    </option>
    <option id="fix-forward">
      <name>Fix Forward</name>
      <pros>Keeps recent work, targeted fix</pros>
      <cons>Longer recovery time, risk of making it worse</cons>
    </option>
    <option id="feature-flag">
      <name>Disable via Feature Flag</name>
      <pros>No deployment needed, instant</pros>
      <cons>Only works if feature-flagged, doesn't fix root cause</cons>
    </option>
  </options>
  <resume-signal>Select: rollback, fix-forward, or feature-flag</resume-signal>
</task>
```

**Success criteria:** Rollback decision confirmed.

---

## Step 2: Identify Rollback Target

**Action:** Determine which version to rollback to.

```bash
# Get recent deployment history
echo "Analyzing deployment history..."

# Get last 5 successful deployments
DEPLOYMENTS=$(git log --oneline --grep="deploy\|release" -n 10 2>/dev/null)

if [ -z "$DEPLOYMENTS" ]; then
  echo "No deployment history found in git log"
  # Try alternative: check Vercel/railway deployment history
  if command -v vercel &> /dev/null; then
    DEPLOYMENTS=$(vercel ls --limit 5 2>/dev/null)
  fi
fi

echo "Recent deployments:"
echo "$DEPLOYMENTS"

# Find last known good version
cat > "$INCIDENT_DIR/rollback-target.md" << 'EOF'
# Rollback Target Analysis

## Current Version
- **Commit:** $(git rev-parse HEAD 2>/dev/null || echo "unknown")
- **Deployed:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- **Version:** [From package.json or deployment]

## Candidate Versions for Rollback

| Version | Commit | Deployed | Status | Notes |
|---------|--------|----------|--------|-------|
| v1.x.x | abc123 | 2026-03-28 | ✅ Stable | Last known good |
| v1.x-1 | def456 | 2026-03-27 | ✅ Stable | |
| v1.x-2 | ghi789 | 2026-03-26 | ⚠️ Issues | Minor bugs |

## Recommended Target

**Version:** [Version to rollback to]
**Commit:** [Git commit hash]
**Rationale:** [Why this version]

## Data Compatibility

- [ ] Database schema compatible
- [ ] API contracts compatible
- [ ] No breaking changes
- [ ] Migration rollback plan ready (if needed)
EOF
```

**Spawn ez-release-agent:**

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
  --agent="ez-release-agent" \
  --model="opus" \
  --prompt="
Analyze deployment history and recommend rollback target.

Current HEAD: $(git rev-parse HEAD 2>/dev/null)
Recent commits:
$(git log --oneline -10 2>/dev/null)

Deployment config:
$(cat vercel.json 2>/dev/null || cat .railway.json 2>/dev/null || echo "No config found")

**Tasks:**
1. Identify last stable version
2. Check for database migrations between versions
3. Verify API compatibility
4. Assess data migration needs
5. Create rollback steps specific to this deployment

**Output:** Update $INCIDENT_DIR/rollback-target.md with specific version and steps.
"
```

**Success criteria:** Clear rollback target identified.

---

## Step 3: Prepare Rollback

**Action:** Execute pre-rollback checklist.

```bash
# Pre-rollback checklist
cat > "$INCIDENT_DIR/pre-rollback.md" << 'EOF'
# Pre-Rollback Checklist

## Notifications
- [ ] Team notified in Slack/Teams
- [ ] Status page updated (if user-facing)
- [ ] On-call engineer confirmed ready
- [ ] Stakeholders aware of timeline

## Backup
- [ ] Database backup created
- [ ] Current state documented
- [ ] Logs captured for post-mortem

## Rollback Steps Reviewed
- [ ] Deployment rollback command ready
- [ ] Database rollback plan (if needed)
- [ ] Cache invalidation plan
- [ ] CDN purge plan (if applicable)

## Verification Plan
- [ ] Health check endpoints identified
- [ ] Smoke tests ready
- [ ] Monitoring dashboards open
- [ ] Alert thresholds confirmed

## Timeline
- **Rollback start:** [Time]
- **Expected duration:** [Minutes]
- **Verification window:** [Minutes]
EOF

echo "Pre-rollback checklist: $INCIDENT_DIR/pre-rollback.md"
```

**Checkpoint: Human Action**

```xml
<task type="checkpoint:human-action" gate="blocking">
  <action>Complete pre-rollback checklist and confirm ready</action>
  <instructions>
    Review and complete the pre-rollback checklist:
    $INCIDENT_DIR/pre-rollback.md
    
    Ensure:
    1. Team is notified
    2. Database backup created (if applicable)
    3. Rollback steps reviewed
    4. Verification plan ready
    
    Type "ready" when all items checked.
  </instructions>
  <verification>I'll check that backup exists and team is notified</verification>
  <resume-signal>Type "ready" or describe blockers</resume-signal>
</task>
```

**Success criteria:** Pre-rollback checklist complete.

---

## Step 4: Execute Rollback

**Action:** Perform the rollback.

**For Vercel deployments:**

```bash
# Rollback on Vercel
if [ -f vercel.json ] && command -v vercel &> /dev/null; then
  echo "Executing Vercel rollback..."
  
  # Get production deployment ID
  PROD_DEPLOYMENT=$(vercel ls --prod --limit 1 2>/dev/null | tail -n1 | awk '{print $1}')
  
  # Find previous deployment
  PREV_DEPLOYMENT=$(vercel ls --limit 2 2>/dev/null | tail -n1 | awk '{print $1}')
  
  echo "Current deployment: $PROD_DEPLOYMENT"
  echo "Rolling back to: $PREV_DEPLOYMENT"
  
  # Execute rollback
  vercel rollback "$PREV_DEPLOYMENT" --yes 2>&1 | tee "$INCIDENT_DIR/rollback-output.log"
  
  ROLLBACK_STATUS=${PIPESTATUS[0]}
  
  if [ $ROLLBACK_STATUS -eq 0 ]; then
    echo "✅ Rollback initiated successfully"
  else
    echo "❌ Rollback failed with status $ROLLBACK_STATUS"
    echo "Check $INCIDENT_DIR/rollback-output.log for details"
  fi
fi
```

**For Railway deployments:**

```bash
# Rollback on Railway
if [ -f .railway.json ] && command -v railway &> /dev/null; then
  echo "Executing Railway rollback..."
  
  # Railway doesn't have direct rollback, redeploy previous commit
  PREV_COMMIT=$(git rev-parse HEAD~1 2>/dev/null)
  
  echo "Redeploying commit: $PREV_COMMIT"
  
  # Checkout previous commit temporarily
  git checkout "$PREV_COMMIT" 2>&1 | tee -a "$INCIDENT_DIR/rollback-output.log"
  
  # Trigger Railway deploy
  railway up 2>&1 | tee -a "$INCIDENT_DIR/rollback-output.log"
  
  # Return to original branch
  git checkout - 2>&1 | tee -a "$INCIDENT_DIR/rollback-output.log"
fi
```

**For manual/Git-based rollback:**

```bash
# Git-based rollback
if [ -n "$(git rev-parse HEAD~1 2>/dev/null)" ]; then
  echo "Executing git-based rollback..."
  
  PREV_COMMIT=$(git rev-parse HEAD~1)
  
  echo "Reverting to commit: $PREV_COMMIT"
  
  # Create rollback commit
  git revert HEAD --no-edit 2>&1 | tee "$INCIDENT_DIR/rollback-output.log"
  
  # Push rollback
  git push origin HEAD 2>&1 | tee -a "$INCIDENT_DIR/rollback-output.log"
  
  echo "✅ Rollback commit created and pushed"
fi
```

**Log rollback:**

```bash
# Record rollback in incident log
cat >> "$INCIDENT_DIR/incident-log.md" << EOF

## Rollback Executed

**Time:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**From:** $(git rev-parse HEAD 2>/dev/null || echo "unknown")
**To:** $(git rev-parse HEAD~1 2>/dev/null || echo "previous")
**Status:** SUCCESS / FAILED

**Output:** $INCIDENT_DIR/rollback-output.log
EOF
```

**Success criteria:** Rollback executed.

---

## Step 5: Verify Rollback

**Action:** Confirm service restored.

```bash
# Post-rollback verification
cat > "$INCIDENT_DIR/post-rollback-verification.md" << 'EOF'
# Post-Rollback Verification

## Service Health

### Health Checks
- [ ] GET /api/health returns 200
- [ ] GET /api/ready returns 200
- [ ] Database connection OK
- [ ] External services connected

### Response Times
- [ ] P50 < 200ms
- [ ] P95 < 500ms
- [ ] P99 < 1000ms

### Error Rates
- [ ] Error rate < 0.1%
- [ ] No 5xx errors
- [ ] No timeout errors

## Functional Verification

### Critical Paths
- [ ] User login works
- [ ] Core feature [name] works
- [ ] Payment processing works (if applicable)
- [ ] Email notifications work (if applicable)

### Data Integrity
- [ ] Database queries succeed
- [ ] No data corruption detected
- [ ] Cache populated correctly

## Monitoring

### Dashboards
- [ ] Error dashboard shows normal levels
- [ ] Latency dashboard shows normal levels
- [ ] Traffic dashboard shows normal patterns

### Alerts
- [ ] No active critical alerts
- [ ] PagerDuty/OpsGenie clear
- [ ] Status page green
EOF

# Run automated health checks
echo "Running automated health checks..."

HEALTH_URL="${HEALTH_CHECK_URL:-https://$(cat vercel.json 2>/dev/null | jq -r '.name').vercel.app/api/health}"

for i in {1..5}; do
  echo "Health check $i/5..."
  
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)
  
  if [ "$RESPONSE" = "200" ]; then
    echo "✅ Health check $i passed (HTTP $RESPONSE)"
  else
    echo "❌ Health check $i failed (HTTP $RESPONSE)"
  fi
  
  sleep 5
done
```

**Checkpoint: Human Verify**

```xml
<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Rollback completed — service should be restored to previous version</what-built>
  <how-to-verify>
    Review post-rollback verification checklist:
    $INCIDENT_DIR/post-rollback-verification.md
    
    **Verify:**
    1. Health checks passing (automated checks above)
    2. Monitoring dashboards show normal levels
    3. Critical user paths working
    4. Error rates returned to baseline
    
    **Check:**
    - Application: [production URL]
    - Monitoring: [Datadog/New Relic dashboard URL]
    - Logs: [Logging platform URL]
  </how-to-verify>
  <resume-signal>Type "verified" or describe remaining issues</resume-signal>
</task>
```

**Success criteria:** Rollback verified successful.

---

## Step 6: Post-Rollback Actions

**Action:** Complete incident response.

```bash
# Update status page
echo "Updating status page..."
# (Integration with status page API would go here)

# Notify stakeholders
cat > "$INCIDENT_DIR/stakeholder-notification.md" << EOF
# Stakeholder Notification

**Subject:** Production Incident Resolved — $(date -u +"%Y-%m-%d")

**Message:**

Team,

The production incident detected at [time] has been resolved.

**Summary:**
- **Issue:** [Brief description]
- **Impact:** [User impact]
- **Resolution:** Rollback to version [version]
- **Duration:** [minutes] minutes
- **Status:** Resolved

**Next Steps:**
- Post-mortem scheduled for [date/time]
- Root cause analysis in progress
- Prevention plan will be shared

Contact [incident commander] for questions.
EOF

# Schedule post-mortem
cat >> "$INCIDENT_DIR/incident-log.md" << EOF

## Post-Mortem

**Scheduled:** [Date/Time]
**Attendees:** [List]
**Facilitator:** [Name]
**Note-taker:** [Name]

**Preparation:**
- [ ] Timeline documented
- [ ] Logs collected
- [ ] Metrics captured
- [ ] Stakeholders interviewed
EOF
```

**Success criteria:** Stakeholders notified, post-mortem scheduled.

---

## Step 7: Create Incident Report

**Action:** Document incident for post-mortem.

```bash
# Generate incident report
cat > "$INCIDENT_DIR/incident-report.md" << EOF
# Incident Report

**Incident ID:** INCIDENT-${TIMESTAMP}
**Date:** $(date -u +"%Y-%m-%d")
**Severity:** P0/P1/P2
**Status:** Resolved

## Summary

[Brief 2-3 sentence summary]

## Timeline

| Time (UTC) | Event |
|------------|-------|
| $(date -u +"%H:%M") | Incident detected |
| $(date -u +"%H:%M") | Rollback decision made |
| $(date -u +"%H:%M") | Rollback executed |
| $(date -u +"%H:%M") | Rollback verified |
| $(date -u +"%H:%M") | Incident resolved |

## Impact

- **Duration:** [X] minutes
- **Users affected:** [X]%
- **Errors:** [X] failed requests
- **Revenue impact:** [If applicable]

## Root Cause

[To be completed in post-mortem]

## Resolution

Rollback to version [version]

## Action Items

- [ ] Complete post-mortem analysis
- [ ] Identify prevention measures
- [ ] Implement monitoring improvements
- [ ] Update runbooks

## Appendix

- Rollback output: $INCIDENT_DIR/rollback-output.log
- Health checks: $INCIDENT_DIR/post-rollback-verification.md
- Communications: $INCIDENT_DIR/stakeholder-notification.md
EOF

echo "Incident report created: $INCIDENT_DIR/incident-report.md"
```

**Success criteria:** Incident documented.

---

## Step 8: Commit Incident Artifacts

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" commit \
  "docs: incident $(date -u +"%Y%m%d") rollback and report" \
  --files "$INCIDENT_DIR/"
```

**Success criteria:** All artifacts committed.

---

## Step 9: Display Summary

```bash
cat << 'EOF'

╔═══════════════════════════════════════════════════════╗
║  ROLLBACK COMPLETE                                    ║
╚═══════════════════════════════════════════════════════╝

Incident: INCIDENT-EOF
echo "${TIMESTAMP}"
cat << 'EOF'

Status: Resolved

Timeline:
- Detected: [time]
- Rollback started: [time]
- Rollback verified: [time]
- Resolved: [time]

Artifacts:
- Incident report: $INCIDENT_DIR/incident-report.md
- Rollback output: $INCIDENT_DIR/rollback-output.log
- Verification: $INCIDENT_DIR/post-rollback-verification.md

Next Steps:
1. Complete post-mortem analysis
2. Implement prevention measures
3. Update runbooks based on learnings

Post-mortem scheduled: [date/time]

EOF
```

**Success criteria:** Clear summary with next steps.

</process>

<files_to_read>
vercel.json
.railway.json
package.json
</files_to_read>

<files_to_edit>
.planning/incidents/*/incident-report.md
.planning/incidents/*/rollback-output.log
.planning/incidents/*/post-rollback-verification.md
</files_to_edit>

<verify>
1. Rollback decision confirmed
2. Rollback target identified
3. Pre-rollback checklist complete
4. Rollback executed
5. Post-rollback verification passed
6. Stakeholders notified
7. Incident report created
8. All artifacts committed
</verify>

<success_criteria>
- **Fast recovery:** Rollback executed within 30 minutes
- **Verified:** Service health confirmed post-rollback
- **Documented:** Complete incident report
- **Communicated:** Stakeholders notified
- **Learned:** Post-mortem scheduled
</success_criteria>
