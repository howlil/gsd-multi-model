<purpose>
Manage hotfix branches: create from main, complete by merging atomically to main (and develop for GitFlow), tag the release, and sync without polluting in-progress work.
</purpose>

<process>

## 1. Parse Arguments

Extract from $ARGUMENTS:
- Subcommand: `start` or `complete`
- Name: slug for the hotfix (e.g., `critical-bug`, `gmail-login-fix`)
- Version (for `complete` only): semver string

**If missing subcommand:**
```
Usage:
  /ez:hotfix start <name>
  /ez:hotfix complete <name> <version>
```
Exit.

## 2. Handle "start" Subcommand

### 2a. Load current state

```bash
# Current branch
CURRENT_BRANCH=$(git branch --show-current)

# Current version
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "0.0.0")

# Load tier from config
TIER=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" config-get release.tier 2>/dev/null || echo "mvp")

# Last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "none")
```

### 2b. Check for uncommitted changes

```bash
git status --short
```

**If uncommitted changes:** Error — "Stash or commit current work before creating a hotfix"

### 2c. Create hotfix branch

```bash
# Get hotfix branch name
HOTFIX_BRANCH=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" hotfix-branch-name "${NAME}")
# Returns: hotfix/{name-slug}

# Branch from main (or last release tag if available)
SOURCE=$(git rev-parse --verify "${LAST_TAG}" 2>/dev/null && echo "${LAST_TAG}" || echo "main")

git checkout "${SOURCE}"
git checkout -b "${HOTFIX_BRANCH}"
```

### 2d. Report to user

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► HOTFIX STARTED: {HOTFIX_BRANCH}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Branch:   {HOTFIX_BRANCH}
From:     {SOURCE} ({CURRENT_VERSION})
Tier:     {TIER}

Make your fix, commit it, then complete:
/ez:hotfix complete {NAME} {NEXT_PATCH_VERSION}

Example:
  Current: {CURRENT_VERSION}
  Next:    {NEXT_PATCH_SUGGESTION}
```

Suggest next patch version: increment patch number (1.2.3 → 1.2.4).

**STOP here for `start` subcommand.**

---

## 3. Handle "complete" Subcommand

### 3a. Validate state

```bash
# Confirm on hotfix branch
CURRENT_BRANCH=$(git branch --show-current)
EXPECTED_BRANCH=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" hotfix-branch-name "${NAME}")

if [ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]; then
  echo "ERROR: Not on hotfix branch. Expected: ${EXPECTED_BRANCH}, got: ${CURRENT_BRANCH}"
  exit 1
fi

# Check for uncommitted changes
git status --short
```

**If uncommitted changes:** Error — "Commit your fix before completing the hotfix"

### 3b. Validate version is semver

```bash
echo "${VERSION}" | grep -E "^[0-9]+\.[0-9]+\.[0-9]+$"
```

**If invalid:** Error — "Version must be semver (X.Y.Z)"

### 3c. Run security gates

```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" release security-gates
```

**If secrets found:** Error — "Remove secrets before completing hotfix"
**If critical vulns:** Warning (not hard block for hotfix — speed matters)

### 3d. Run tests

```bash
npm test 2>/dev/null || yarn test 2>/dev/null || echo "WARNING: No test command found"
```

**If tests fail:** Warning — "Tests failing. Hotfix will be tagged but verify before pushing."

### 3e. Load tier and git strategy

```bash
TIER=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" config-get release.tier 2>/dev/null || echo "mvp")
```

Determine sync target:
- MVP/Medium: No sync needed (just main)
- Enterprise: Also sync to develop

### 3f. Generate changelog entry

```bash
LAST_TAG=$(git describe --tags --abbrev=0 main 2>/dev/null || echo "")
if [ -n "$LAST_TAG" ]; then
  COMMITS=$(git log ${LAST_TAG}..HEAD --oneline --no-merges)
fi
```

Format entry for CHANGELOG.md:
```markdown
## [{VERSION}] — {date} (hotfix)

### Bug Fixes
- {fix commit message(s)}
```

### 3g. Merge to main

```bash
git checkout main
git merge --no-ff "${HOTFIX_BRANCH}" -m "hotfix(release): merge ${HOTFIX_BRANCH} for v${VERSION}"
```

**If merge conflict:**
```
MERGE CONFLICT during hotfix merge.
Resolve conflicts in: {conflicting files}
Then run: git commit && /ez:hotfix complete {NAME} {VERSION}
```
STOP.

### 3h. Bump version and update changelog

```bash
# Bump version in package.json
node -e "
  const pkg = JSON.parse(require('fs').readFileSync('package.json'));
  pkg.version = '${VERSION}';
  require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

# Update CHANGELOG.md (prepend entry)
```

### 3i. Create rollback plan

Write to `.planning/releases/v${VERSION}-ROLLBACK-PLAN.md` using rollback-plan template.

### 3j. Commit and tag

```bash
git add CHANGELOG.md package.json .planning/releases/
git commit -m "chore(hotfix): v${VERSION} — ${NAME}

Hotfix: ${NAME}
Previous: v${PREVIOUS_VERSION}"

git tag -a "v${VERSION}" -m "Hotfix v${VERSION}: ${NAME}"
```

### 3k. Sync to develop (Enterprise tier only)

```bash
if [ "$TIER" = "enterprise" ]; then
  # Check if develop exists
  git rev-parse --verify develop 2>/dev/null
  if [ $? -eq 0 ]; then
    git checkout develop
  fi
fi
```

### Enterprise: Sync hotfix ke develop

1. Cek apakah sync akan conflict:
   ```
   git merge-base --is-ancestor v{version} develop
   ```

2. Jika tidak conflict → `git merge v{version} --no-ff -m "chore: sync hotfix v{version} to develop"`

3. **Jika CONFLICT terdeteksi:**
   - Jangan auto-merge. Beri instruksi eksplisit:
   ```
   ⚠️ MERGE CONFLICT: Hotfix sync ke develop memerlukan manual resolution.

   Langkah:
   a. git checkout develop
   b. git merge v{version}
   c. Resolve conflicts di file yang di-list git
   d. git add . && git merge --continue
   e. git push origin develop

   PENTING: Hotfix SUDAH di production (main + tag).
   Develop conflict tidak memblokir hotfix — selesaikan setelah production stabil.
   ```

### 3l. Clean up hotfix branch (optional)

```bash
git branch -d "${HOTFIX_BRANCH}"
```

### 3m. Report completion

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► HOTFIX COMPLETE: v{VERSION} ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Hotfix:   {NAME}
Version:  v{VERSION}
Tag:      v{VERSION}
Changelog: Updated
Rollback:  .planning/releases/v{VERSION}-ROLLBACK-PLAN.md

{If enterprise:}
Synced to develop: ✓

### To Ship
git push origin main && git push origin v{VERSION}

{If enterprise:}
git push origin develop
```

</process>

<success_criteria>

### start
- [ ] Uncommitted changes check passed
- [ ] Hotfix branch created from main (or last tag)
- [ ] User sees branch name and complete instructions

### complete
- [ ] On correct hotfix branch
- [ ] Security gates run
- [ ] Tests run (warn if fail, don't block)
- [ ] Changelog entry generated
- [ ] Merged to main with no-ff
- [ ] Version bumped in package.json
- [ ] Rollback plan created
- [ ] Release tagged
- [ ] Develop synced (enterprise tier only)
- [ ] Hotfix branch cleaned up
- [ ] User sees push instructions

</success_criteria>
