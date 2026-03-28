---
workflow: dependency-audit
version: 1.0.0
last_updated: 2026-03-29
description: Audit dependencies for outdated packages, security vulnerabilities, and license compliance
tags: [dependencies, security, maintenance]
---

<objective>
Systematic audit of project dependencies to identify security vulnerabilities, outdated packages, and license issues.

**Outcomes:**
1. All dependencies scanned for known vulnerabilities (npm audit)
2. Outdated packages identified with upgrade paths
3. License compliance verified
4. Dependency health report generated
5. Critical security updates added to ROADMAP as urgent tasks

**Strategy:** Automated scanning + manual review for breaking changes.
</objective>

<execution_context>
@~/.qwen/ez-agents/references/git-strategy.md
@~/.qwen/ez-agents/agents/ez-debugger.md
@~/.qwen/ez-agents/agents/ez-executor.md
</execution_context>

<process>

## Step 1: Initialize Dependency Audit

**Action:** Set up audit context and gather dependency information.

```bash
# Initialize
INIT=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" init milestone-op)
if [[ "$INIT" != *"success"* ]]; then
  echo "Failed to initialize"
  exit 1
fi

# Create audit directory
mkdir -p .planning/dependencies

# Detect package manager
if [ -f "pnpm-lock.yaml" ]; then
  PKG_MANAGER="pnpm"
elif [ -f "yarn.lock" ]; then
  PKG_MANAGER="yarn"
elif [ -f "package-lock.json" ]; then
  PKG_MANAGER="npm"
else
  echo "No package manager lock file found"
  exit 1
fi

echo "Using package manager: $PKG_MANAGER"
```

**Success criteria:** Package manager detected, audit directory created.

---

## Step 2: Security Vulnerability Scan

**Action:** Run npm audit to find known vulnerabilities.

```bash
# Run security audit
echo "Scanning for security vulnerabilities..."

if [ "$PKG_MANAGER" = "pnpm" ]; then
  pnpm audit --json > .planning/dependencies/npm-audit.json 2>/dev/null || true
elif [ "$PKG_MANAGER" = "yarn" ]; then
  yarn npm audit --json > .planning/dependencies/npm-audit.json 2>/dev/null || true
else
  npm audit --json > .planning/dependencies/npm-audit.json 2>/dev/null || true
fi

# Parse audit results
if [ -f .planning/dependencies/npm-audit.json ]; then
  VULN_COUNT=$(cat .planning/dependencies/npm-audit.json | jq '.vulnerabilities | length' 2>/dev/null || echo "0")
  
  CRITICAL=$(cat .planning/dependencies/npm-audit.json | jq '[.vulnerabilities | to_entries[] | select(.value.severity == "critical")] | length' 2>/dev/null || echo "0")
  HIGH=$(cat .planning/dependencies/npm-audit.json | jq '[.vulnerabilities | to_entries[] | select(.value.severity == "high")] | length' 2>/dev/null || echo "0")
  MODERATE=$(cat .planning/dependencies/npm-audit.json | jq '[.vulnerabilities | to_entries[] | select(.value.severity == "moderate")] | length' 2>/dev/null || echo "0")
  LOW=$(cat .planning/dependencies/npm-audit.json | jq '[.vulnerabilities | to_entries[] | select(.value.severity == "low")] | length' 2>/dev/null || echo "0")
  
  echo "Vulnerabilities found:"
  echo "  Critical: $CRITICAL"
  echo "  High: $HIGH"
  echo "  Moderate: $MODERATE"
  echo "  Low: $LOW"
else
  echo "No vulnerabilities found or audit failed"
  VULN_COUNT=0
fi
```

**Success criteria:** Security scan complete.

---

## Step 3: Outdated Packages Scan

**Action:** Identify packages with newer versions available.

```bash
# Check for outdated packages
echo "Checking for outdated packages..."

if [ "$PKG_MANAGER" = "pnpm" ]; then
  pnpm outdated --json > .planning/dependencies/outdated.json 2>/dev/null || echo "{}" > .planning/dependencies/outdated.json
elif [ "$PKG_MANAGER" = "yarn" ]; then
  yarn outdated --json > .planning/dependencies/outdated.json 2>/dev/null || echo "{}" > .planning/dependencies/outdated.json
else
  npm outdated --json > .planning/dependencies/outdated.json 2>/dev/null || echo "{}" > .planning/dependencies/outdated.json
fi

# Count outdated packages
OUTDATED_COUNT=$(cat .planning/dependencies/outdated.json | jq 'keys | length' 2>/dev/null || echo "0")

echo "Outdated packages: $OUTDATED_COUNT"

# Categorize by update type
MAJOR_UPDATES=$(cat .planning/dependencies/outdated.json | jq '[to_entries[] | select(.value.wanted != .value.latest and (.value.wanted | split(".")[0] | tonumber) != (.value.latest | split(".")[0] | tonumber))] | length' 2>/dev/null || echo "0")
MINOR_UPDATES=$(cat .planning/dependencies/outdated.json | jq '[to_entries[] | select(.value.wanted != .value.latest)] | length' 2>/dev/null || echo "0")

echo "  Major updates available: $MAJOR_UPDATES"
echo "  Minor/patch updates: $MINOR_UPDATES"
```

**Success criteria:** Outdated packages identified.

---

## Step 4: License Compliance Check

**Action:** Verify all dependencies have compatible licenses.

```bash
# Check licenses
echo "Checking license compliance..."

# Install license-checker if not present
if ! command -v license-checker &> /dev/null; then
  npm install -g license-checker 2>/dev/null
fi

# Run license check
license-checker --json > .planning/dependencies/licenses.json 2>/dev/null

# Check for problematic licenses
RESTRICTIVE_LICENSES=$(cat .planning/dependencies/licenses.json | jq '[to_entries[] | select(.value.licenses | test("GPL|AGPL|LGPL|SSPL|Commons Clause"; "i"))] | length' 2>/dev/null || echo "0")

UNKNOWN_LICENSES=$(cat .planning/dependencies/licenses.json | jq '[to_entries[] | select(.value.licenses == "UNKNOWN" or .value.licenses == undefined)] | length' 2>/dev/null || echo "0")

echo "License issues:"
echo "  Restrictive licenses (GPL family): $RESTRICTIVE_LICENSES"
echo "  Unknown licenses: $UNKNOWN_LICENSES"

# List problematic packages
if [ "$RESTRICTIVE_LICENSES" -gt 0 ]; then
  echo ""
  echo "Packages with restrictive licenses:"
  cat .planning/dependencies/licenses.json | jq -r 'to_entries[] | select(.value.licenses | test("GPL|AGPL|LGPL|SSPL|Commons Clause"; "i")) | "  \(.key): \(.value.licenses)"'
fi

if [ "$UNKNOWN_LICENSES" -gt 0 ]; then
  echo ""
  echo "Packages with unknown licenses:"
  cat .planning/dependencies/licenses.json | jq -r 'to_entries[] | select(.value.licenses == "UNKNOWN" or .value.licenses == undefined) | "  \(.key)"'
fi
```

**Success criteria:** License compliance verified.

---

## Step 5: Generate Dependency Health Report

**Action:** Create comprehensive dependency audit report.

```bash
# Generate report
cat > .planning/dependencies/DEPENDENCY_AUDIT.md << EOF
# Dependency Health Report

**Date:** $(date -u +"%Y-%m-%d")
**Package Manager:** $PKG_MANAGER
**Total Dependencies:** $(cat package.json | jq '.dependencies | length' 2>/dev/null || echo "unknown")

---

## Security Vulnerabilities

**Total:** $VULN_COUNT
- Critical: $CRITICAL
- High: $HIGH
- Moderate: $MODERATE
- Low: $LOW

$(if [ "$VULN_COUNT" -gt 0 ]; then
echo "### Vulnerable Packages"
cat .planning/dependencies/npm-audit.json | jq -r '.vulnerabilities | to_entries[] | "- **\(.key)**: \(.value.severity) - \(.value.title)"' 2>/dev/null || echo "Unable to parse"
fi)

---

## Outdated Packages

**Total Outdated:** $OUTDATED_COUNT
- Major updates available: $MAJOR_UPDATES
- Minor/patch updates: $MINOR_UPDATES

$(if [ "$OUTDATED_COUNT" -gt 0 ]; then
echo "### Critical Updates (Major Version)"
cat .planning/dependencies/outdated.json | jq -r 'to_entries[] | select(.value.wanted != .value.latest) | "- **\(.key)**: \(.value.wanted) → \(.value.latest)"' 2>/dev/null | head -20
fi)

---

## License Compliance

**Restrictive Licenses:** $RESTRICTIVE_LICENSES
**Unknown Licenses:** $UNKNOWN_LICENSES

$(if [ "$RESTRICTIVE_LICENSES" -gt 0 ] || [ "$UNKNOWN_LICENSES" -gt 0 ]; then
echo "### Action Required"
echo ""
echo "Review packages with restrictive or unknown licenses for compliance."
fi)

---

## Recommendations

### Immediate (This Week)
$(if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
echo "- [ ] Fix critical/high security vulnerabilities"
fi)
$(if [ "$MAJOR_UPDATES" -gt 0 ]; then
echo "- [ ] Review major version updates for breaking changes"
fi)
- [ ] Update patch/minor versions for non-breaking updates

### Short-term (This Month)
- [ ] Resolve restrictive license issues
- [ ] Investigate unknown licenses
- [ ] Plan major version upgrades

### Long-term (Quarterly)
- [ ] Establish dependency update cadence
- [ ] Consider automated dependency updates (Dependabot, Renovate)
- [ ] Review and remove unused dependencies

---

## Detailed Data

- Security audit: .planning/dependencies/npm-audit.json
- Outdated packages: .planning/dependencies/outdated.json
- Licenses: .planning/dependencies/licenses.json
EOF

echo "Dependency audit report created: .planning/dependencies/DEPENDENCY_AUDIT.md"
```

**Success criteria:** Comprehensive report generated.

---

## Step 6: Create Update Plans for Critical Issues

**Action:** Generate actionable update plans for critical/high vulnerabilities.

```bash
if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
  echo "Creating remediation plans for critical/high vulnerabilities..."
  
  # Extract critical and high vulnerabilities
  cat .planning/dependencies/npm-audit.json | jq -r '.vulnerabilities | to_entries[] | select(.value.severity == "critical" or .value.severity == "high") | @base64' | while read -r vuln_b64; do
    _jq() {
      echo "${vuln_b64}" | base64 --decode | jq -r "${1}"
    }
    
    PKG_NAME=$(_jq '.key')
    SEVERITY=$(_jq '.value.severity')
    TITLE=$(_jq '.value.title')
    FIX_VERSION=$(_jq '.value.fixVersion // "unknown"')
    
    # Create update plan
    cat > ".planning/dependencies/update-${PKG_NAME//\//_}.md" << EOF
# Security Update: $PKG_NAME

**Severity:** $SEVERITY
**Issue:** $TITLE
**Current Version:** $(cat .planning/dependencies/outdated.json | jq -r ".\"$PKG_NAME\".wanted // \"unknown\"" 2>/dev/null)
**Fixed Version:** $FIX_VERSION

## Update Steps

1. **Review changelog** — Check for breaking changes
2. **Update package** — \`$PKG_MANAGER add $PKG_NAME@$FIX_VERSION\`
3. **Run tests** — Verify no regressions
4. **Update lock file** — Commit package-lock.json
5. **Verify fix** — Re-run npm audit

## Breaking Changes

[To be filled after reviewing changelog]

## Rollback Plan

If issues found:
\`\`\`bash
$PKG_MANAGER add $PKG_NAME@$(cat .planning/dependencies/outdated.json | jq -r ".\"$PKG_NAME\".wanted // \"previous\"" 2>/dev/null)
\`\`\`

## Verification

- [ ] Package updated
- [ ] Tests passing
- [ ] No new vulnerabilities
- [ ] Deployed to staging
- [ ] Verified in production
EOF
  done
  
  echo "Update plans created in .planning/dependencies/"
fi
```

**Success criteria:** Update plans for all critical/high issues.

---

## Step 7: Update ROADMAP for Critical Security Updates

**Action:** Add urgent dependency updates to roadmap.

```bash
if [ "$CRITICAL" -gt 0 ]; then
  echo "Adding critical security updates to ROADMAP..."
  
  # Spawn ez-roadmapper to add security phases
  node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
    --agent="ez-roadmapper" \
    --model="opus" \
    --prompt="
Add critical dependency security updates to ROADMAP.md.

Current ROADMAP:
$(cat .planning/ROADMAP.md)

Critical vulnerabilities:
$(cat .planning/dependencies/npm-audit.json | jq '.vulnerabilities | to_entries[] | select(.value.severity == "critical")' 2>/dev/null)

**Action:**
1. Add dependency update phase as decimal phase after current
2. Label as SECURITY CRITICAL
3. Include affected packages

Example:

## Phase 06.1: Critical Security Updates — Dependencies

**Priority:** CRITICAL

**Goal:** Update packages with critical security vulnerabilities

**Packages:**
- [Package 1]: [vulnerability description]
- [Package 2]: [vulnerability description]

**Success:** npm audit shows 0 critical vulnerabilities

**Output:** Updated ROADMAP.md
"
  
  echo "$ROADMAPPER_OUTPUT" > .planning/ROADMAP.md
fi
```

**Success criteria:** Critical updates in roadmap.

---

## Step 8: Commit Audit Results

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" commit \
  "docs: dependency audit $(date -u +"%Y-%m-%d")" \
  --files .planning/dependencies/
```

**Success criteria:** All artifacts committed.

---

## Step 9: Display Summary

```bash
cat << 'EOF'

╔═══════════════════════════════════════════════════════╗
║  DEPENDENCY AUDIT COMPLETE                            ║
╚═══════════════════════════════════════════════════════╝

Security:
  Vulnerabilities: EOF
echo "    $VULN_COUNT total ($CRITICAL critical, $HIGH high)"
cat << 'EOF'

Updates:
EOF
echo "  Outdated: $OUTDATED_COUNT ($MAJOR_UPDATES major)"
cat << 'EOF'

Licenses:
EOF
echo "  Issues: $RESTRICTIVE_LICENSES restrictive, $UNKNOWN_LICENSES unknown"
cat << 'EOF'

Report: .planning/dependencies/DEPENDENCY_AUDIT.md

EOF

if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
  cat << 'EOF'
⚠️  CRITICAL/HIGH VULNERABILITIES FOUND

Review .planning/dependencies/DEPENDENCY_AUDIT.md
Critical updates added to ROADMAP as urgent phases
Run: npm audit fix (with caution for breaking changes)

EOF
fi
```

**Success criteria:** Clear summary with action items.

</process>

<files_to_read>
package.json
package-lock.json / yarn.lock / pnpm-lock.yaml
</files_to_read>

<files_to_edit>
.planning/dependencies/DEPENDENCY_AUDIT.md
.planning/dependencies/npm-audit.json
.planning/dependencies/outdated.json
.planning/dependencies/licenses.json
.planning/dependencies/update-*.md
.planning/ROADMAP.md
</files_to_edit>

<verify>
1. Security vulnerability scan complete
2. Outdated packages identified
3. License compliance checked
4. Dependency health report generated
5. Update plans created for critical issues
6. Critical updates added to ROADMAP
7. All artifacts committed
</verify>

<success_criteria>
- **Complete scan:** All dependencies audited
- **Actionable:** Update plans for critical issues
- **Prioritized:** Critical security issues in ROADMAP
- **Documented:** Comprehensive audit report
- **Compliant:** License issues identified
</success_criteria>
