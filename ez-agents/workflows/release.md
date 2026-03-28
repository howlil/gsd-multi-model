<purpose>
Orchestrate tier-aware production releases. Validates state, runs security gates, evaluates tier checklist, creates release branch, generates changelog, bumps version, writes rollback plan, and tags the release.
</purpose>

<process>

<auto_invoke>
Check for --no-auto in ARGUMENTS. If present, skip this section and proceed to step 1.

```bash
SMART_ORCH=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" config-get smart_orchestration.enabled 2>/dev/null || echo "true")
```
If `SMART_ORCH` is `"false"`: skip, proceed to step 1.

**Tier-based pre-flight:**
Parse the tier argument from ARGUMENTS (mvp / medium / enterprise).

- **mvp**: No pre-flight auto-invocations. Proceed directly to step 1.
- **medium**: Check if a VERIFICATION.md from verify-work already exists for the current phase. If not:
  → Display: `[auto] Running verify-work before medium release...`
  → Invoke: Skill(ez:verify-work)
  → Continue to step 1.
- **enterprise**: Run in sequence:
  → Display: `[auto] Running verify-work...`
  → Invoke: Skill(ez:verify-work)
  → Display: `[auto] Running audit-milestone...`
  → Invoke: Skill(ez:audit-milestone)
  → Display: `[auto] Running arch-review...`
  → Invoke: Skill(ez:arch-review)
  → Continue to step 1.

All auto-invocations are prefixed with `[auto]` in output. Override with `--no-auto` to skip all pre-invocations.
</auto_invoke>

## 1. Initialize

Parse $ARGUMENTS:
- Command: `release` or `preflight`
- Tier: `mvp`, `medium`, or `enterprise`
- Version: semver string (e.g., `1.0.0`)

**If missing tier or version (for release command):**
```
Usage: /ez:release <tier> <version>
       /ez:release preflight <tier>

Examples:
  /ez:release mvp v1.0.0
  /ez:release medium v1.5.0
  /ez:release enterprise v2.0.0
  /ez:release preflight medium
```
Exit.

**Normalize version:** Strip leading `v` if present (e.g., `v1.0.0` → `1.0.0`).

**Load tier config:**
```bash
TIER_CONFIG=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" tier-config "${TARGET_TIER}" 2>/dev/null)
```

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► RELEASE v{version} — {TIER} TIER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 2. Validate Semver

```bash
echo "${VERSION}" | grep -E "^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$"
```

**If invalid:** Error — "Version must be semver (X.Y.Z). Got: {version}"

## 3. Check Current State

```bash
# Uncommitted changes
git status --short

# Current branch
git branch --show-current

# Current version
CURRENT=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "0.0.0")
```

**If uncommitted changes:** Error — "Commit or stash all changes before releasing"

## 4. Run Security Gates

```bash
echo "Running security gates..."

# Gate 1: No secrets in tracked files
SECRET_HITS=$(git grep -i -E "(api[_-]?key|password|secret)['\"]?\s*[=:]\s*['\"]?[a-zA-Z0-9+/]{20,}" HEAD 2>/dev/null | \
  grep -v "example\|placeholder\|your-key\|process\.env\|env\.\|config\.\|getenv" | wc -l)

# Gate 2: npm audit
npm audit --audit-level=critical 2>/dev/null
AUDIT_EXIT=$?

# Gate 3: Production TODOs
PROD_TODOS=$(grep -rn "TODO\|FIXME\|HACK" src/ --include="*.ts" --include="*.js" --include="*.py" 2>/dev/null | \
  grep -v "test\|spec\|__test__\|\.test\." | wc -l)

# Gate 4: .env in .gitignore
grep -q "^\.env" .gitignore 2>/dev/null && ENV_SAFE=true || ENV_SAFE=false
```

Security gate results:
```
Security Gates:
  ✓/✗ No secrets in committed files ({SECRET_HITS} found)
  ✓/✗ npm audit clean (exit {AUDIT_EXIT})
  ✓/✗ No production TODOs ({PROD_TODOS} found)
  ✓/✗ .env in .gitignore
```

**Hard stop:** If SECRET_HITS > 0 → "BLOCKED: Secrets found in committed files. Remove before releasing."
**Hard stop:** If AUDIT_EXIT is non-zero → "BLOCKED: Critical vulnerabilities found. Run npm audit fix."

## 5. Run Tier Checklist

Load checklist template from `~/.claude/ez-agents/templates/release-checklist.md`.

Run automated checks for the target tier:

```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" release check-tier "${TARGET_TIER}"
```

Display checklist results with pass/fail/skip for each item.

**If `preflight` command:** Display checklist results and exit here.

## 6. Check Coverage (if test coverage available)

```bash
# Try to find coverage report
COVERAGE=$(cat coverage/coverage-summary.json 2>/dev/null | jq '.total.lines.pct // 0')
```

Coverage thresholds by tier:
- mvp: 60%
- medium: 80%
- enterprise: 95%

**If below threshold:** Warning (not hard blocker — tests may not be configured).

## 7. Spawn Release Agent

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
◆ Spawning release agent...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Release agent prompt:

```markdown
<objective>
Create a {TARGET_TIER} tier release v{VERSION}.
</objective>

<release_config>
Tier: {TARGET_TIER}
Version: {VERSION}
Current version: {CURRENT_VERSION}
</release_config>

<files_to_read>
- package.json (current version and scripts)
- CHANGELOG.md (if exists — append new entry)
- .planning/config.json (release tier config)
- ~/.claude/ez-agents/templates/release-checklist.md (checklist template)
- ~/.claude/ez-agents/templates/rollback-plan.md (rollback template)
</files_to_read>

<security_gate_results>
{security gate results from step 4}
</security_gate_results>

<checklist_results>
{checklist results from step 5}
</checklist_results>

<tasks>
1. Create release branch (per tier: trunk | github-flow | gitflow)
2. Generate changelog from git log since last tag
3. Bump version in package.json to {VERSION}
4. Create rollback plan in .planning/releases/v{VERSION}-ROLLBACK-PLAN.md
5. Commit release artifacts
6. Tag v{VERSION}
7. Report production readiness score
</tasks>
```

```
Task(
  prompt=release_prompt,
  subagent_type="ez-release-agent",
  model="{planner_model from init}"
)
```

## 8. Handle Agent Return

**`## RELEASE COMPLETE`:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► RELEASE v{version} READY ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{agent summary}

### To Ship
git push origin {branch} && git push origin v{version}

### Rollback Plan
.planning/releases/v{version}-ROLLBACK-PLAN.md
```

**If blocked:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► RELEASE BLOCKED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{blocker details}

Fix the above issues then re-run: /ez:release {tier} v{version}
```

</process>

<success_criteria>
- [ ] Tier and version validated
- [ ] Uncommitted changes check passed
- [ ] All security gates run (fail on hard blockers)
- [ ] Tier checklist evaluated
- [ ] Coverage checked against tier threshold
- [ ] ez-release-agent spawned with full context
- [ ] Release branch created per tier strategy
- [ ] Changelog updated
- [ ] Version bumped in package.json
- [ ] Rollback plan written
- [ ] Tag created
- [ ] User sees push instructions and production readiness score
</success_criteria>
