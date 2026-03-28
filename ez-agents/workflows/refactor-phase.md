---
workflow: refactor-phase
version: 1.0.0
last_updated: 2026-03-29
description: Create refactor plans from technical debt identified in VERIFICATION.md files
tags: [refactoring, technical-debt, quality]
---

<objective>
Systematically address technical debt by creating refactor plans from VERIFICATION.md files across completed phases.

**Outcomes:**
1. All VERIFICATION.md files reviewed for anti-patterns, TODOs, FIXMEs
2. Technical debt grouped by concern (security, performance, maintainability)
3. Refactor plans created with risk assessment
4. Plans added to ROADMAP.md as decimal phases or new milestone items
5. STATE.md updated with refactor tracking

**Strategy:** Quality over speed — thorough debt analysis prevents future issues.
</objective>

<execution_context>
@~/.qwen/ez-agents/workflows/transition.md
@~/.qwen/ez-agents/references/verification-patterns.md
@~/.qwen/ez-agents/references/git-strategy.md
@~/.qwen/ez-agents/templates/phase-prompt.md
@~/.qwen/ez-agents/agents/ez-planner.md
@~/.qwen/ez-agents/agents/ez-executor.md
</execution_context>

<process>

## Step 1: Initialize Refactor Analysis

**Action:** Load project context and prepare for debt analysis.

```bash
INIT=$(node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" init milestone-op)
if [[ "$INIT" != *"success"* ]]; then
  echo "Failed to initialize milestone operation"
  exit 1
fi
```

**Read all VERIFICATION.md files:**

```bash
# Find all VERIFICATION.md files in completed phases
VERIFICATION_FILES=$(find .planning/phases -name "VERIFICATION.md" -o -name "*-VERIFICATION.md" 2>/dev/null)

if [ -z "$VERIFICATION_FILES" ]; then
  echo "No VERIFICATION.md files found — no technical debt to address"
  exit 0
fi

# Count verification files
VERIFICATION_COUNT=$(echo "$VERIFICATION_FILES" | wc -l | tr -d ' ')
echo "Found $VERIFICATION_COUNT VERIFICATION.md files to analyze"
```

**Success criteria:** All verification files located and ready for analysis.

---

## Step 2: Extract Technical Debt Items

**Action:** Parse VERIFICATION.md files for debt indicators.

**Spawn ez-planner (Research Mode):**

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
  --agent="ez-planner" \
  --model="sonnet" \
  --prompt="
Analyze these VERIFICATION.md files and extract all technical debt items:

Files to analyze:
$VERIFICATION_FILES

For each file, extract:
1. **Anti-patterns** — Code smells, design issues mentioned
2. **TODOs** — Intentional deferred work
3. **FIXMEs** — Known bugs or broken functionality
4. **XXX/HACK** — Temporary workarounds
5. **Performance concerns** — Slow queries, inefficient algorithms
6. **Security concerns** — Auth gaps, input validation issues
7. **Maintainability issues** — Complex code, poor test coverage
8. **Scalability concerns** — Bottlenecks, single points of failure

Output format (JSON):
{
  \"debt_items\": [
    {
      \"category\": \"security|performance|maintainability|scalability\",
      \"severity\": \"critical|high|medium|low\",
      \"phase\": \"phase-number\",
      \"description\": \"What needs refactoring\",
      \"location\": \"file:path or component\",
      \"impact\": \"Why this matters\",
      \"effort_estimate\": \"S|M|L/XL\"
    }
  ]
}

Group by category first, then by severity.
"
```

**Save extracted debt:**

```bash
# Save to refactor analysis file
mkdir -p .planning/refactor
echo "$PLANNER_OUTPUT" > .planning/refactor/debt-analysis.json
```

**Success criteria:** All debt items extracted and categorized.

---

## Step 3: Prioritize and Group Debt

**Action:** Create prioritized refactor backlog.

**Spawn ez-planner (Prioritization):**

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
  --agent="ez-planner" \
  --model="opus" \
  --prompt="
Prioritize the extracted technical debt items and create a refactor backlog.

Input: $(cat .planning/refactor/debt-analysis.json)

**Prioritization Framework:**

1. **Critical (P0)** — Security vulnerabilities, data loss risk, production blockers
2. **High (P1)** — Performance bottlenecks, major maintainability issues
3. **Medium (P2)** — Code smells, test coverage gaps, minor performance issues
4. **Low (P3)** — Nice-to-have improvements, cosmetic issues

**Grouping Strategy:**

Group related items into refactor epics:
- **Security hardening** — Auth, input validation, secrets management
- **Performance optimization** — Query optimization, caching, algorithm improvements
- **Code quality** — Refactoring complex functions, improving test coverage
- **Architecture improvements** — Decoupling, design patterns, modularity
- **Developer experience** — Documentation, tooling, build times

**Output format (JSON):**
{
  \"refactor_backlog\": [
    {
      \"epic\": \"Epic name\",
      \"priority\": \"P0|P1|P2|P3\",
      \"items\": [...],
      \"total_effort\": \"S|M|L|XL\",
      \"risk_level\": \"low|medium|high\",
      \"dependencies\": []
    }
  ],
  \"recommended_order\": [\"epic-1\", \"epic-2\", ...]
}

**Consider:**
- Dependencies between epics (must do security before architecture)
- Risk level (high-risk refactors may need dedicated phases)
- Effort estimation (group small items, separate large ones)
- Current milestone goals (align with roadmap if possible)
"
```

**Save prioritized backlog:**

```bash
echo "$PLANNER_OUTPUT" > .planning/refactor/prioritized-backlog.json
```

**Success criteria:** Clear prioritization with epic groupings.

---

## Step 4: Create Refactor Plans

**Action:** Generate executable refactor plans for each epic.

**For each epic in backlog:**

```bash
# Read prioritized backlog
EPICS=$(cat .planning/refactor/prioritized-backlog.json | jq -r '.refactor_backlog | to_entries | .[]')

for EPIC in $EPICS; do
  EPIC_NAME=$(echo "$EPIC" | jq -r '.value.epic | gsub("[^a-zA-Z0-9]"; "-") | ascii_downcase')
  EPIC_PRIORITY=$(echo "$EPIC" | jq -r '.value.priority')
  
  # Determine phase type based on priority
  if [ "$EPIC_PRIORITY" = "P0" ] || [ "$EPIC_PRIORITY" = "P1" ]; then
    PHASE_TYPE="urgent"
  else
    PHASE_TYPE="standard"
  fi
  
  # Spawn ez-planner to create detailed refactor plan
  node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
    --agent="ez-planner" \
    --model="opus" \
    --prompt="
Create an executable refactor plan for this epic:

Epic: $(echo "$EPIC" | jq -r '.value.epic')
Priority: $EPIC_PRIORITY
Items: $(echo "$EPIC" | jq -r '.value.items')
Effort: $(echo "$EPIC" | jq -r '.value.total_effort')

**Plan Structure:**

1. **Objective** — Clear statement of what this refactor achieves
2. **Scope** — Files/components affected
3. **Tasks** — Atomic, testable refactor tasks with:
   - Task name and description
   - Files to modify
   - Success criteria (how to verify refactor worked)
   - Rollback plan (if refactor fails)
4. **Testing Strategy** — How to ensure refactor doesn't break functionality
5. **Metrics** — How to measure improvement (e.g., performance gain, coverage increase)
6. **Risk Mitigation** — Specific steps to reduce refactor risk

**Output:** Use the phase-prompt template format.
"
  
  # Save refactor plan
  PLAN_FILE=".planning/refactor/${EPIC_NAME}-PLAN.md"
  echo "$PLANNER_OUTPUT" > "$PLAN_FILE"
  
  echo "Created refactor plan: $PLAN_FILE"
done
```

**Success criteria:** Each epic has a detailed, executable plan.

---

## Step 5: Add Refactor Phases to ROADMAP

**Action:** Integrate refactor work into the roadmap.

**Spawn ez-roadmapper:**

```bash
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" task spawn \
  --agent="ez-roadmapper" \
  --model="opus" \
  --prompt="
Add refactor epics to the ROADMAP.md as new phases.

Current ROADMAP:
$(cat .planning/ROADMAP.md)

Refactor backlog:
$(cat .planning/refactor/prioritized-backlog.json)

**Integration Strategy:**

1. **Urgent refactors (P0/P1)** — Add as decimal phases after current phase
   - Example: If current phase is 06, add as 06.1, 06.2, etc.
   
2. **Standard refactors (P2)** — Add to next milestone or as dedicated phases
   - Example: Phase 15: Security Hardening
   
3. **Low priority (P3)** — Add to backlog section or future milestone

**For each refactor phase, add to ROADMAP:**

## Phase XX: {Epic Name}

**Priority:** P0|P1|P2|P3

**Goal:** {One-sentence goal}

**Scope:**
- {Component 1}
- {Component 2}

**Success Metrics:**
- {Metric 1}
- {Metric 2}

**Effort:** S|M|L|XL

**Risk:** low|medium|high

**Dependencies:** {Phase numbers if any}

**Plan:** .planning/refactor/{epic-name}-PLAN.md

**Output:** Updated ROADMAP.md with refactor phases inserted at appropriate positions.
"
```

**Update ROADMAP.md:**

```bash
echo "$ROADMAPPER_OUTPUT" > .planning/ROADMAP.md
```

**Success criteria:** Refactor phases integrated into roadmap.

---

## Step 6: Update STATE.md

**Action:** Track refactor initiative in project state.

```bash
# Create refactor state section
cat >> .planning/STATE.md << 'EOF'

## Refactor Initiative

**Started:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

**Backlog:** .planning/refactor/prioritized-backlog.json

**Plans:**
$(ls -1 .planning/refactor/*-PLAN.md 2>/dev/null | sed 's/^/- /')

**Roadmap Integration:**
- Urgent refactors: Decimal phases after current
- Standard refactors: Dedicated phases in next milestone
- Low priority: Backlog section

**Progress:**
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Code quality improvements
- [ ] Architecture refactoring
EOF
```

**Success criteria:** STATE.md reflects refactor tracking.

---

## Step 7: Commit Refactor Plans

**Action:** Commit all refactor artifacts.

```bash
# Commit refactor plans and roadmap updates
node "$EZ_AGENTS_ROOT/bin/ez-tools.cjs" commit \
  "docs: add refactor plans and roadmap integration" \
  --files .planning/refactor/ .planning/ROADMAP.md .planning/STATE.md
```

**Commit message format:**
```
docs: add refactor plans ({N} epics)

- Security hardening (P0)
- Performance optimization (P1)
- Code quality improvements (P2)

Refactor phases added to ROADMAP.md
Tracking added to STATE.md
```

**Success criteria:** All artifacts committed with clear message.

---

## Step 8: Display Summary

**Action:** Show refactor initiative summary.

```bash
cat << 'EOF'

╔═══════════════════════════════════════════════════════╗
║  REFACTOR INITIATIVE CREATED                          ║
╚═══════════════════════════════════════════════════════╝

Technical Debt Analysis Complete

Debt Items Found: $(cat .planning/refactor/debt-analysis.json | jq '.debt_items | length')
Refactor Epics Created: $(cat .planning/refactor/prioritized-backlog.json | jq '.refactor_backlog | length')

Refactor Backlog:
$(cat .planning/refactor/prioritized-backlog.json | jq -r '.refactor_backlog[] | "  \(.priority): \(.epic) (\(.total_effort))"')

Roadmap Integration:
- Urgent refactors added as decimal phases
- Standard refactors in next milestone
- Low priority in backlog

Next Steps:
1. Review refactor plans in .planning/refactor/
2. Prioritize with stakeholders
3. Execute refactor phases using /ez:execute-phase

Artifacts:
- Debt analysis: .planning/refactor/debt-analysis.json
- Prioritized backlog: .planning/refactor/prioritized-backlog.json
- Refactor plans: .planning/refactor/*-PLAN.md
- Updated roadmap: .planning/ROADMAP.md

EOF
```

**Success criteria:** Clear summary displayed.

</process>

<files_to_read>
.planning/phases/*/VERIFICATION.md
.planning/phases/*/*-VERIFICATION.md
.planning/ROADMAP.md
.planning/STATE.md
</files_to_read>

<files_to_edit>
.planning/ROADMAP.md
.planning/STATE.md
.planning/refactor/debt-analysis.json
.planning/refactor/prioritized-backlog.json
.planning/refactor/*-PLAN.md
</files_to_edit>

<verify>
1. All VERIFICATION.md files analyzed
2. Debt items extracted and categorized
3. Refactor epics prioritized
4. Executable plans created for each epic
5. ROADMAP.md updated with refactor phases
6. STATE.md updated with refactor tracking
7. All artifacts committed
</verify>

<success_criteria>
- **Debt visibility:** All technical debt from VERIFICATION.md files captured
- **Prioritization:** Clear P0/P1/P2/P3 prioritization
- **Actionable plans:** Each epic has executable refactor plan
- **Roadmap integration:** Refactor work visible in ROADMAP.md
- **State tracking:** STATE.md reflects refactor initiative
</success_criteria>
