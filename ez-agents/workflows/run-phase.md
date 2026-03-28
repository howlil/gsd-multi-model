# EZ ► Run Phase

Iterative phase execution with pause points. Runs all phases from a starting point: discuss → plan → execute → verify, with user approval between each step.

## Usage

```
/ez:run-phase [start-phase] [--no-discuss] [--no-verify] [--yolo]
```

## Workflow

### 0. Initialize Context

```bash
INIT=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" init milestone-op)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Parse from INIT:
- `commit_docs` — Boolean
- `planning_path` — Path to .planning/
- `state_path` — Path to STATE.md
- `roadmap_path` — Path to ROADMAP.md
- `requirements_path` — Path to REQUIREMENTS.md

Resolve models:
```bash
PLANNER_MODEL=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" resolve-model ez-planner --raw)
EXECUTOR_MODEL=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" resolve-model ez-executor --raw)
VERIFIER_MODEL=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" resolve-model ez-verifier --raw)
```

---

### 1. Parse Arguments

From `$ARGUMENTS`, extract:
- `START_PHASE` — First arg (number), or auto-detect
- `NO_DISCUSS` — `--no-discuss` present
- `NO_VERIFY` — `--no-verify` present
- `YOLO` — `--yolo` present

---

### 2. Validate & Discover Phases

```bash
PHASES_JSON=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" roadmap list-phases)
```

Parse phases from ROADMAP.md:
```javascript
const phases = parsePhasesFromRoadmap(roadmap_path);
```

Filter incomplete phases (no SUMMARY.md):
```javascript
const incompletePhases = phases.filter(p => !p.hasSummary);
```

**If all phases complete:**
```
✓ All phases are already complete!

Next steps:
  /ez:audit-milestone     — Verify all requirements met
  /ez:complete-milestone  — Archive milestone, create git tag
```
**Exit.**

**Determine starting phase:**
- If `START_PHASE` specified: use it
- Else: use first incomplete phase

Display phase list:
```
## Phases to Execute

| Phase | Goal | Status |
|-------|------|--------|
| 1 | Foundation | ⏳ Pending |
| 2 | Authentication | ⏳ Pending |
| 3 | Task CRUD | ✓ Complete |
| 4 | Team Features | ⏳ Pending |

Starting from Phase {START_PHASE}
```

---

### 3. Execute Phases Iteratively

For each `phase` from `START_PHASE` to end:

```
═══════════════════════════════════════════════════════
 PHASE {N}: {PHASE_NAME}
═══════════════════════════════════════════════════════

Goal: {PHASE_GOAL}
```

#### Step 1: Discuss (if not skipped)

**If `NO_DISCUSS` is false:**

Check if CONTEXT.md exists:
```bash
if [[ -f ".planning/phases/${PHASE_DIR}/CONTEXT.md" ]]; then
  AskUserQuestion:
    header: "Context"
    question: "CONTEXT.md exists. Update or skip?"
    options:
      - "Update context"
      - "Skip (use existing)"
      - "View existing"
```

**If user chooses discuss:**

```
Task(
  prompt="<objective>
Discuss Phase {N}: {PHASE_NAME}

Extract implementation decisions for downstream agents.
Create CONTEXT.md with locked decisions.
</objective>

<files_to_read>
- .planning/PROJECT.md
- .planning/REQUIREMENTS.md
- .planning/ROADMAP.md
- .planning/phases/*/CONTEXT.md
</files_to_read>

<phase_info>
Phase {N}: {PHASE_GOAL}
</phase_info>

Write to: .planning/phases/{PHASE_DIR}/CONTEXT.md
",
  subagent_type="ez-discuss-phase",
  model="{PLANNER_MODEL}",
  description="Discuss Phase {N}"
)
```

**If `NO_DISCUSS` is true:** Skip to Step 2.

---

#### Pause Point 1 (unless --yolo)

**If `YOLO` is false:**

```
AskUserQuestion:
  header: "Continue?"
  question: "Discuss complete. Continue to plan?"
  options:
    - "Yes, continue"
    - "Review context"
    - "Pause here"
```

**If "Pause here":**
```
Work paused at Phase {N} after discuss.

Resume with:
  /ez:run-phase {N} --no-discuss

Or continue manually:
  /ez:plan-phase {N}
```
**Exit.**

---

#### Step 2: Plan

```
Task(
  prompt="<objective>
Create executable phase plan for Phase {N}: {PHASE_NAME}

Research domain (if needed), create task breakdown.
</objective>

<files_to_read>
- .planning/PROJECT.md
- .planning/REQUIREMENTS.md
- .planning/phases/{PHASE_DIR}/CONTEXT.md
- .planning/research/SUMMARY.md
</files_to_read>

<phase_info>
Phase {N}: {PHASE_GOAL}
</phase_info>

Write to: .planning/phases/{PHASE_DIR}/{N}-PLAN.md
",
  subagent_type="ez-planner",
  model="{PLANNER_MODEL}",
  description="Plan Phase {N}"
)
```

Display plan summary:
```
## Plan Created — Phase {N}

Tasks:
- Task {N}-01: {description}
- Task {N}-02: {description}
- Task {N}-03: {description}

Estimated: {X} plans total
```

---

#### Pause Point 2 (unless --yolo)

**If `YOLO` is false:**

```
AskUserQuestion:
  header: "Continue?"
  question: "Plan complete. Continue to execute?"
  options:
    - "Yes, continue"
    - "Review plan"
    - "Pause here"
```

**If "Pause here":**
```
Work paused at Phase {N} after plan.

Resume with:
  /ez:run-phase {N} --no-discuss

Or continue manually:
  /ez:execute-phase {N}
```
**Exit.**

---

#### Step 3: Execute

```
Task(
  prompt="<objective>
Execute all plans in Phase {N}: {PHASE_NAME}

Wave-based parallel execution. One commit per task.
</objective>

<files_to_read>
- .planning/phases/{PHASE_DIR}/{N}-PLAN.md
- .planning/phases/{PHASE_DIR}/CONTEXT.md
</files_to_read>

<phase_info>
Phase {N}: {PHASE_GOAL}
</phase_info>
",
  subagent_type="ez-execute-phase",
  model="{EXECUTOR_MODEL}",
  description="Execute Phase {N}"
)
```

Display execution summary:
```
## Execution Complete — Phase {N}

Commits:
- {sha} — Task {N}-01: {name}
- {sha} — Task {N}-02: {name}
- {sha} — Task {N}-03: {name}

All plans executed successfully.
```

---

#### Pause Point 3 (unless --yolo or --no-verify)

**If `YOLO` is false AND `NO_VERIFY` is false:**

```
AskUserQuestion:
  header: "Continue?"
  question: "Execute complete. Continue to verify?"
  options:
    - "Yes, continue"
    - "Skip verification"
    - "Pause here"
```

**If "Pause here":**
```
Work paused at Phase {N} after execute.

Resume with:
  /ez:run-phase {N} --no-discuss --no-verify

Or continue manually:
  /ez:verify-work {N}
```
**Exit.**

---

#### Step 4: Verify (if not skipped)

**If `NO_VERIFY` is false:**

```
Task(
  prompt="<objective>
Verify Phase {N}: {PHASE_NAME}

Manual testing with auto-diagnosis.
</objective>

<files_to_read>
- .planning/phases/{PHASE_DIR}/{N}-PLAN.md
- .planning/phases/{PHASE_DIR}/SUMMARY.md
- .planning/REQUIREMENTS.md
</files_to_read>

<phase_info>
Phase {N}: {PHASE_GOAL}
</phase_info>

Write to: .planning/phases/{PHASE_DIR}/{N}-UAT.md
",
  subagent_type="ez-verifier",
  model="{VERIFIER_MODEL}",
  description="Verify Phase {N}"
)
```

Display verification summary:
```
## Verification Complete — Phase {N}

Tests: {X} passed, {Y} failed

{If failures:}
⚠ {Y} test(s) failed. Fix plans will be created.

{If all passed:}
✓ All tests passed!
```

---

#### Pause Point 4 (unless --yolo)

**If `YOLO` is false:**

```
AskUserQuestion:
  header: "Continue?"
  question: "Phase {N} complete. Continue to Phase {N+1}?"
  options:
    - "Yes, continue"
    - "Pause here"
    - "View progress"
```

**If "Pause here":**
```
Work paused after Phase {N} complete.

Resume with:
  /ez:run-phase {N+1}

Or continue manually:
  /ez:plan-phase {N+1}
```
**Exit.**

**If "View progress":**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" progress --brief
```
Then ask again.

---

#### Update State

After each phase complete:
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" state update-phase-complete --phase={N}
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" roadmap update-phase-status --phase={N} --status=complete
```

**If `commit_docs` is true:**
```bash
git add .planning/STATE.md .planning/ROADMAP.md
git commit -m "docs: complete Phase {N} — {PHASE_NAME}"
```

---

#### Display Phase Complete Banner

```
═══════════════════════════════════════════════════════
 ✓ PHASE {N} COMPLETE
═══════════════════════════════════════════════════════

Summary: {PHASE_SUMMARY}

Progress: {X}/{TOTAL} phases complete
```

---

### 4. All Phases Complete

```
═══════════════════════════════════════════════════════
 ✓ ALL PHASES COMPLETE
═══════════════════════════════════════════════════════

Milestone ready for audit.

Next steps:
  /ez:audit-milestone        — Verify all requirements met
  /ez:complete-milestone     — Archive milestone, create git tag
  /ez:new-milestone          — Start next version cycle

Or review:
  /ez:progress               — See full project status
  /ez:stats                  — View metrics dashboard
```

---

### 5. Error Handling

**If any step fails:**
```
❌ Error: {error_message}

Phase {N} stopped at: {step_name}

Options:
  1. Fix and retry this step
  2. Skip this step, continue to next
  3. Pause and resume later

Resume with:
  /ez:run-phase {N} [flags]
```

**If subagent fails:**
```
❌ Subagent failed: {agent_name}

Error: {error_details}

Retry with fresh context? (y/n)
```

---

### 6. Stuck Detection

Start at beginning:
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" stuck-watch start \
  --operation="run-phase" \
  --max-retries=1 \
  --timeout=600
```

If stuck detected:
```
⚠ Operation appears stuck (no progress in 10 minutes)

Debug: Run `/ez:debug` to see current state

Continue waiting? (y/n)
```

---

## Success Criteria

- [ ] Phases discovered from ROADMAP.md
- [ ] Starting phase validated
- [ ] Each phase executed: discuss → plan → execute → verify
- [ ] Pause points respected (unless --yolo)
- [ ] STATE.md updated after each phase
- [ ] ROADMAP.md progress updated
- [ ] User knows next steps

---

## Examples

```bash
# Start from first incomplete phase
/ez:run-phase

# Start from phase 2
/ez:run-phase 2

# Skip discussion (CONTEXT.md exists)
/ez:run-phase 3 --no-discuss

# Skip verification
/ez:run-phase 1 --no-verify

# Fully autonomous (no pauses)
/ez:run-phase 1 --yolo

# Combined flags
/ez:run-phase 2 --no-discuss --no-verify
```
