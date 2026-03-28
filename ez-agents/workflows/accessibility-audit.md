---
workflow: accessibility-audit
version: 1.0.0
last_updated: 2026-03-29
description: Accessibility audit for WCAG 2.1 AA compliance using axe-core and manual testing
tags: [accessibility, a11y, compliance, wcag]
---

<objective>
Comprehensive accessibility audit to ensure WCAG 2.1 AA compliance and inclusive user experience.

**Outcomes:**
1. Automated accessibility scan with axe-core
2. Manual testing for keyboard navigation
3. Screen reader compatibility verified
4. Color contrast analysis completed
5. Accessibility report with remediation plan
6. Critical barriers added to ROADMAP as urgent fixes

**Strategy:** Automated + manual testing — tools catch 50%, human testing catches the rest.
</objective>

<execution_context>
@~/.qwen/ez-agents/references/verification-patterns.md
@~/.qwen/ez-agents/references/git-strategy.md
@~/.qwen/ez-agents/agents/ez-verifier.md
@~/.qwen/ez-agents/agents/ez-executor.md
</execution_context>

<process>

## Step 1: Initialize Accessibility Audit

**Action:** Set up audit context and install testing tools.

```bash
# Initialize
INIT=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" init milestone-op)
if [[ "$INIT" != *"success"* ]]; then
  echo "Failed to initialize"
  exit 1
fi

# Create audit directory
mkdir -p .planning/accessibility

# Install axe-core CLI if not present
if ! command -v axe &> /dev/null; then
  echo "Installing axe-core CLI..."
  npm install -g @axe-core/cli 2>/dev/null
fi

# Install pa11y for additional testing
if ! command -v pa11y &> /dev/null; then
  echo "Installing pa11y..."
  npm install -g pa11y 2>/dev/null
fi

echo "Accessibility audit tools installed"
```

**Success criteria:** Audit tools installed.

---

## Step 2: Automated Accessibility Scan

**Action:** Run axe-core on all application pages.

```bash
# Discover all routes/pages
echo "Discovering application routes..."

# For Next.js apps
if [ -d "src/app" ]; then
  # Extract routes from app directory
  ROUTES=$(find src/app -name "page.tsx" -o -name "page.ts" -o -name "page.js" 2>/dev/null | \
    sed 's|src/app||' | sed 's|/page\.\(tsx\|ts\|js\)||' | \
    sed 's|^\(.*\)$|\1|' | \
    grep -v "^$" || echo "/")
fi

# For pages directory
if [ -d "src/pages" ]; then
  PAGES_ROUTES=$(find src/pages -name "*.tsx" -o -name "*.ts" -o -name "*.js" 2>/dev/null | \
    sed 's|src/pages||' | sed 's|\.\(tsx\|ts\|js\)||' | \
    grep -v "^$" || echo "/")
  ROUTES="$ROUTES $PAGES_ROUTES"
fi

# Default to homepage if no routes found
if [ -z "$ROUTES" ]; then
  ROUTES="/"
fi

echo "Routes to audit: $ROUTES"

# Start dev server if not running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "Starting dev server for accessibility testing..."
  npm run dev &
  DEV_SERVER_PID=$!
  
  # Wait for server to be ready
  echo "Waiting for dev server..."
  timeout 60 bash -c 'until curl -s http://localhost:3000 > /dev/null 2>&1; do sleep 1; done'
  
  if [ $? -ne 0 ]; then
    echo "Failed to start dev server"
    exit 1
  fi
  
  echo "Dev server ready at http://localhost:3000"
fi

# Run axe-core on each route
echo "Running automated accessibility scan..."

for ROUTE in $ROUTES; do
  URL="http://localhost:3000$ROUTE"
  echo "Auditing: $URL"
  
  axe "$URL" --output .planning/accessibility/axe-$(echo "$ROUTE" | tr '/' '_').json --exit
done

# Aggregate results
echo "Aggregating axe-core results..."

cat > .planning/accessibility/axe-summary.json << 'EOF'
{
  "routes": [],
  "total_violations": 0,
  "critical_violations": 0,
  "serious_violations": 0,
  "moderate_violations": 0,
  "minor_violations": 0
}
EOF

# Count violations
TOTAL_VIOLATIONS=$(cat .planning/accessibility/axe-*.json 2>/dev/null | jq -s '[.[].violations | length] | add' 2>/dev/null || echo "0")
CRITICAL=$(cat .planning/accessibility/axe-*.json 2>/dev/null | jq -s '[.[].violations[]? | select(.impact == "critical")] | length' 2>/dev/null || echo "0")
SERIOUS=$(cat .planning/accessibility/axe-*.json 2>/dev/null | jq -s '[.[].violations[]? | select(.impact == "serious")] | length' 2>/dev/null || echo "0")
MODERATE=$(cat .planning/accessibility/axe-*.json 2>/dev/null | jq -s '[.[].violations[]? | select(.impact == "moderate")] | length' 2>/dev/null || echo "0")
MINOR=$(cat .planning/accessibility/axe-*.json 2>/dev/null | jq -s '[.[].violations[]? | select(.impact == "minor")] | length' 2>/dev/null || echo "0")

echo "Accessibility violations found:"
echo "  Critical: $CRITICAL"
echo "  Serious: $SERIOUS"
echo "  Moderate: $MODERATE"
echo "  Minor: $MINOR"
```

**Success criteria:** Automated scan complete.

---

## Step 3: Keyboard Navigation Testing

**Action:** Test keyboard accessibility manually.

```bash
# Create keyboard testing checklist
cat > .planning/accessibility/keyboard-test.md << 'EOF'
# Keyboard Navigation Test

**Date:** [Date]
**Tester:** [Name]
**Browser:** [Browser + Version]

## Test Routes

For each route, complete the following tests:

### Route: /

#### Navigation
- [ ] Tab through all interactive elements
- [ ] Shift+Tab reverses focus order
- [ ] Focus order is logical and follows visual order
- [ ] No keyboard traps (can tab away from all elements)

#### Interactive Elements
- [ ] All links activated with Enter
- [ ] All buttons activated with Enter or Space
- [ ] Form fields focusable and editable
- [ ] Dropdowns operable with arrow keys
- [ ] Modal dialogs trap focus correctly

#### Skip Links
- [ ] "Skip to main content" link present
- [ ] Skip link is first focusable element
- [ ] Skip link target exists and works

#### Focus Indicators
- [ ] All focusable elements have visible focus indicator
- [ ] Focus indicator has sufficient contrast (3:1)
- [ ] Focus indicator is not removed via CSS

## Issues Found

| Route | Issue | Severity | Description |
|-------|-------|----------|-------------|
| / | Missing | High | Skip link not present |
| /about | Broken | Medium | Dropdown not keyboard accessible |

## Notes

[Any additional observations]
EOF

echo "Keyboard testing checklist created: .planning/accessibility/keyboard-test.md"
```

**Checkpoint: Human Action**

```xml
<task type="checkpoint:human-action" gate="blocking">
  <action>Complete keyboard navigation testing</action>
  <instructions>
    Use the keyboard testing checklist:
    .planning/accessibility/keyboard-test.md
    
    **Test each route:**
    1. Navigate using only Tab, Shift+Tab, Enter, Space, and arrow keys
    2. Verify all interactive elements are accessible
    3. Check focus indicators are visible
    4. Test skip links if present
    
    **Routes to test:**
    - Homepage: http://localhost:3000
    - Key user flows: [list critical paths]
    
    Document all issues found in the checklist.
  </instructions>
  <verification>Review completed checklist for thoroughness</verification>
  <resume-signal>Type "done" when keyboard testing complete</resume-signal>
</task>
```

**Success criteria:** Keyboard testing complete.

---

## Step 4: Screen Reader Testing

**Action:** Test with screen readers.

```bash
# Create screen reader testing checklist
cat > .planning/accessibility/screen-reader-test.md << 'EOF'
# Screen Reader Testing

**Date:** [Date]
**Tester:** [Name]
**Screen Reader:** NVDA (Windows) / VoiceOver (macOS) / JAWS (Windows)
**Browser:** [Browser + Version]

## Test Scenarios

### Homepage
- [ ] Page title announced correctly
- [ ] Main landmarks identified (header, nav, main, footer)
- [ ] Headings announced in logical order
- [ ] Links have meaningful text (not "click here")
- [ ] Images have appropriate alt text
- [ ] Forms have associated labels
- [ ] Error messages announced
- [ ] Dynamic content changes announced (ARIA live regions)

### Navigation
- [ ] Skip link announced
- [ ] Navigation landmarks identified
- [ ] Current page indicated
- [ ] Dropdown menus announced correctly

### Interactive Components
- [ ] Buttons announced as buttons
- [ ] Form fields have role and state
- [ ] Tables have headers and captions
- [ ] Modal dialogs announced and focus trapped
- [ ] Tabs announced with position (tab 1 of 4)

## Issues Found

| Component | Issue | Severity | Screen Reader Output |
|-----------|-------|----------|---------------------|
| Hero image | Missing alt | High | "image" (no description) |
| Nav menu | Not announced | High | No indication of menu |

## Notes

[Any additional observations about screen reader experience]
EOF

echo "Screen reader testing checklist created"
```

**Checkpoint: Human Action**

```xml
<task type="checkpoint:human-action" gate="blocking">
  <action>Complete screen reader testing</action>
  <instructions>
    Test with a screen reader (NVDA, VoiceOver, or JAWS):
    
    **Setup:**
    - Windows: Install NVDA (free) or use JAWS
    - macOS: Use built-in VoiceOver (Cmd+F5)
    
    **Test scenarios:**
    1. Navigate homepage with screen reader
    2. Complete a key user flow (e.g., form submission)
    3. Navigate using headings only (H key)
    4. Navigate using landmarks (D key in NVDA)
    
    **Document:**
    - What gets announced
    - What's missing or confusing
    - Where navigation breaks
    
    Use checklist: .planning/accessibility/screen-reader-test.md
  </instructions>
  <verification>Review completed checklist</verification>
  <resume-signal>Type "done" when screen reader testing complete</resume-signal>
</task>
```

**Success criteria:** Screen reader testing complete.

---

## Step 5: Color Contrast Analysis

**Action:** Verify color contrast meets WCAG AA standards.

```bash
# Create contrast testing guide
cat > .planning/accessibility/contrast-test.md << 'EOF'
# Color Contrast Analysis

**WCAG 2.1 AA Requirements:**
- Normal text (< 18pt): 4.5:1 contrast ratio
- Large text (≥ 18pt or 14pt bold): 3:1 contrast ratio
- UI components and graphics: 3:1 contrast ratio

## Tools

- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **A11y Contrast Checker:** Browser extension
- **axe DevTools:** Automated contrast checks

## Colors to Test

### Primary Text
- Body text on background: __:1 (Pass/Fail)
- Heading text on background: __:1 (Pass/Fail)
- Link text on background: __:1 (Pass/Fail)

### Secondary Text
- Muted/caption text: __:1 (Pass/Fail)
- Placeholder text: __:1 (Pass/Fail)

### UI Components
- Button text on button background: __:1 (Pass/Fail)
- Input border on background: __:1 (Pass/Fail)
- Icon on background: __:1 (Pass/Fail)

### Interactive States
- Focus indicator: __:1 (Pass/Fail)
- Hover state: __:1 (Pass/Fail)
- Error state: __:1 (Pass/Fail)

## Issues Found

| Element | Foreground | Background | Ratio | Required | Status |
|---------|------------|------------|-------|----------|--------|
| Body text | #666666 | #FFFFFF | 5.2:1 | 4.5:1 | ✅ Pass |
| Muted text | #999999 | #FFFFFF | 2.8:1 | 4.5:1 | ❌ Fail |

## Recommendations

[List specific color changes needed to meet contrast requirements]
EOF

echo "Contrast testing guide created"
```

**Checkpoint: Human Action**

```xml
<task type="checkpoint:human-action" gate="blocking">
  <action>Complete color contrast analysis</action>
  <instructions>
    Test color contrast ratios using WebAIM Contrast Checker:
    https://webaim.org/resources/contrastchecker/
    
    **Test all text and UI elements:**
    1. Body text on backgrounds
    2. Headings on backgrounds
    3. Button text on button backgrounds
    4. Form borders and placeholders
    5. Icons on backgrounds
    6. Focus indicators
    
    **WCAG AA Requirements:**
    - Normal text: 4.5:1 minimum
    - Large text: 3:1 minimum
    - UI components: 3:1 minimum
    
    Document results in: .planning/accessibility/contrast-test.md
  </instructions>
  <verification>Review contrast ratios meet WCAG AA</verification>
  <resume-signal>Type "done" when contrast analysis complete</resume-signal>
</task>
```

**Success criteria:** Color contrast analysis complete.

---

## Step 6: Generate Accessibility Report

**Action:** Create comprehensive accessibility audit report.

```bash
# Generate report
cat > .planning/accessibility/ACCESSIBILITY_AUDIT.md << EOF
# Accessibility Audit Report

**Date:** $(date -u +"%Y-%m-%d")
**Standard:** WCAG 2.1 AA
**Tools:** axe-core, pa11y, Manual testing

---

## Executive Summary

**Overall Status:** [Pass/Fail/Partial]

**Automated Scan Results:**
- Total violations: $TOTAL_VIOLATIONS
- Critical: $CRITICAL
- Serious: $SERIOUS
- Moderate: $MODERATE
- Minor: $MINOR

**Manual Testing:**
- Keyboard navigation: [Pass/Fail/Issues]
- Screen reader: [Pass/Fail/Issues]
- Color contrast: [Pass/Fail/Issues]

---

## Automated Violations

$(if [ "$TOTAL_VIOLATIONS" -gt 0 ]; then
cat .planning/accessibility/axe-*.json | jq -r '.[].violations[]? | "- **\(.id)** (\(.impact)): \(.description)\n  - Help: \(.helpUrl)\n  - Elements: \(.nodes | length)"' 2>/dev/null | head -50
else
echo "No automated violations found."
fi)

---

## Manual Testing Results

### Keyboard Navigation

[Summary from keyboard-test.md]

**Key Issues:**
- [Issue 1]
- [Issue 2]

### Screen Reader Testing

[Summary from screen-reader-test.md]

**Key Issues:**
- [Issue 1]
- [Issue 2]

### Color Contrast

[Summary from contrast-test.md]

**Failing Elements:**
- [Element 1]: [ratio]:1 (needs [required]:1)
- [Element 2]: [ratio]:1 (needs [required]:1)

---

## WCAG 2.1 AA Compliance Checklist

### Perceivable
- [ ] 1.1.1 Non-text Content
- [ ] 1.2.1 Audio-only and Video-only
- [ ] 1.3.1 Info and Relationships
- [ ] 1.3.2 Meaningful Sequence
- [ ] 1.3.3 Sensory Characteristics
- [ ] 1.4.1 Use of Color
- [ ] 1.4.2 Audio Control
- [ ] 1.4.3 Contrast (Minimum)
- [ ] 1.4.4 Resize Text
- [ ] 1.4.5 Images of Text

### Operable
- [ ] 2.1.1 Keyboard
- [ ] 2.1.2 No Keyboard Trap
- [ ] 2.2.1 Timing Adjustable
- [ ] 2.2.2 Pause, Stop, Hide
- [ ] 2.3.1 Three Flashes
- [ ] 2.4.1 Bypass Blocks
- [ ] 2.4.2 Page Titled
- [ ] 2.4.3 Focus Order
- [ ] 2.4.4 Link Purpose
- [ ] 2.4.5 Multiple Ways
- [ ] 2.4.6 Headings and Labels
- [ ] 2.4.7 Focus Visible

### Understandable
- [ ] 3.1.1 Language of Page
- [ ] 3.1.2 Language of Parts
- [ ] 3.2.1 On Focus
- [ ] 3.2.2 On Input
- [ ] 3.2.3 Consistent Navigation
- [ ] 3.2.4 Consistent Identification
- [ ] 3.3.1 Error Identification
- [ ] 3.3.2 Labels or Instructions
- [ ] 3.3.3 Error Suggestion
- [ ] 3.3.4 Error Prevention

### Robust
- [ ] 4.1.1 Parsing
- [ ] 4.1.2 Name, Role, Value
- [ ] 4.1.3 Status Messages

---

## Remediation Plan

### Critical (Fix Immediately)
- [Critical issue 1]
- [Critical issue 2]

### High Priority (This Sprint)
- [High priority issue 1]
- [High priority issue 2]

### Medium Priority (This Month)
- [Medium priority issue 1]
- [Medium priority issue 2]

### Low Priority (Backlog)
- [Low priority issue 1]
- [Low priority issue 2]

---

## Detailed Data

- axe-core results: .planning/accessibility/axe-*.json
- Keyboard test: .planning/accessibility/keyboard-test.md
- Screen reader test: .planning/accessibility/screen-reader-test.md
- Contrast test: .planning/accessibility/contrast-test.md
EOF

echo "Accessibility audit report created: .planning/accessibility/ACCESSIBILITY_AUDIT.md"
```

**Success criteria:** Comprehensive report generated.

---

## Step 7: Create Remediation Plans

**Action:** Generate actionable fix plans for critical issues.

```bash
# Extract critical issues and create remediation plans
if [ "$CRITICAL" -gt 0 ]; then
  echo "Creating remediation plans for critical accessibility issues..."
  
  cat .planning/accessibility/axe-*.json | jq -r '.[].violations[]? | select(.impact == "critical") | @base64' | while read -r issue_b64; do
    _jq() {
      echo "${issue_b64}" | base64 --decode | jq -r "${1}"
    }
    
    ISSUE_ID=$(_jq '.id')
    ISSUE_DESC=$(_jq '.description')
    ISSUE_HELP=$(_jq '.help')
    ISSUE_URL=$(_jq '.helpUrl')
    ELEMENT_COUNT=$(_jq '.nodes | length')
    
    cat > ".planning/accessibility/fix-${ISSUE_ID}.md" << EOF
# Accessibility Fix: $ISSUE_ID

**Severity:** Critical
**Description:** $ISSUE_DESC
**Affected Elements:** $ELEMENT_COUNT

## Guidance

$ISSUE_HELP

**WCAG Reference:** $ISSUE_URL

## Fix Steps

1. **Identify affected elements** — Review axe-core JSON for specific selectors
2. **Implement fix** — [Specific fix based on issue type]
3. **Test** — Re-run axe-core to verify fix
4. **Manual verify** — Test with keyboard/screen reader

## Verification

- [ ] Fix implemented
- [ ] axe-core passes
- [ ] Keyboard test passes
- [ ] Screen reader test passes
- [ ] Deployed to production
EOF
  done
  
  echo "Remediation plans created in .planning/accessibility/"
fi
```

**Success criteria:** Remediation plans for critical issues.

---

## Step 8: Update ROADMAP for Critical Issues

**Action:** Add critical accessibility fixes to roadmap.

```bash
if [ "$CRITICAL" -gt 0 ]; then
  echo "Adding critical accessibility fixes to ROADMAP..."
  
  node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
    --agent="ez-roadmapper" \
    --model="opus" \
    --prompt="
Add critical accessibility fixes to ROADMAP.md.

Current ROADMAP:
$(cat .planning/ROADMAP.md)

Critical accessibility issues:
$(cat .planning/accessibility/axe-*.json | jq '[.[].violations[]? | select(.impact == "critical")]' 2>/dev/null)

**Action:**
1. Add accessibility remediation phase as decimal phase
2. Label as ACCESSIBILITY CRITICAL
3. Include specific WCAG criteria

Example:

## Phase 06.1: Accessibility Remediation — Critical Barriers

**Priority:** CRITICAL

**Goal:** Fix critical accessibility barriers blocking users

**Issues:**
- [Issue 1]: [WCAG criterion]
- [Issue 2]: [WCAG criterion]

**Success:** axe-core shows 0 critical violations

**Output:** Updated ROADMAP.md
"
  
  echo "$ROADMAPPER_OUTPUT" > .planning/ROADMAP.md
fi
```

**Success criteria:** Critical issues in roadmap.

---

## Step 9: Commit Audit Results

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" commit \
  "docs: accessibility audit $(date -u +"%Y-%m-%d")" \
  --files .planning/accessibility/
```

**Success criteria:** All artifacts committed.

---

## Step 10: Display Summary

```bash
# Kill dev server if we started it
if [ -n "$DEV_SERVER_PID" ]; then
  kill $DEV_SERVER_PID 2>/dev/null
  echo "Dev server stopped"
fi

cat << 'EOF'

╔═══════════════════════════════════════════════════════╗
║  ACCESSIBILITY AUDIT COMPLETE                         ║
╚═══════════════════════════════════════════════════════╝

Automated Scan:
EOF
echo "  Violations: $TOTAL_VIOLATIONS ($CRITICAL critical, $SERIOUS serious)"
cat << 'EOF'

Manual Testing:
  Keyboard navigation: [Complete/Issues]
  Screen reader: [Complete/Issues]
  Color contrast: [Complete/Issues]

Report: .planning/accessibility/ACCESSIBILITY_AUDIT.md

EOF

if [ "$CRITICAL" -gt 0 ]; then
  cat << 'EOF'
⚠️  CRITICAL ACCESSIBILITY BARRIERS FOUND

Review .planning/accessibility/ACCESSIBILITY_AUDIT.md
Critical issues added to ROADMAP as urgent phases
Fix before any production release

EOF
fi
```

**Success criteria:** Clear summary with action items.

</process>

<files_to_read>
src/app/**/page.tsx
src/pages/**/*
package.json
</files_to_read>

<files_to_edit>
.planning/accessibility/ACCESSIBILITY_AUDIT.md
.planning/accessibility/axe-*.json
.planning/accessibility/keyboard-test.md
.planning/accessibility/screen-reader-test.md
.planning/accessibility/contrast-test.md
.planning/accessibility/fix-*.md
.planning/ROADMAP.md
</files_to_edit>

<verify>
1. Automated accessibility scan complete
2. Keyboard navigation testing complete
3. Screen reader testing complete
4. Color contrast analysis complete
5. Accessibility report generated
6. Remediation plans created for critical issues
7. Critical issues added to ROADMAP
8. All artifacts committed
</verify>

<success_criteria>
- **Complete audit:** Automated + manual testing
- **Actionable:** Remediation plans for all critical issues
- **Prioritized:** Critical barriers in ROADMAP
- **Documented:** Comprehensive audit report
- **WCAG aligned:** Mapped to WCAG 2.1 AA criteria
</success_criteria>
