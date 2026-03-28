---
name: ez:run-phase
description: Run all phases iteratively with pause points for approval. Discuss-phase runs in --auto mode by default for autonomous execution.
argument-hint: "[start-phase] [--no-discuss] [--discuss-interactive] [--no-verify] [--yolo]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - AskUserQuestion
  - Task
---

<objective>
Execute all phases iteratively from a starting phase. For each phase: discuss → plan → execute → verify, with pause points for user approval between each step. Auto-advances to next phase after completion.

**Orchestrator role:** Discover phases from ROADMAP.md, iterate through each phase with user-controlled pauses, track progress, handle completions.

**Creates/Updates:**
- `.planning/STATE.md` — updated after each phase
- `.planning/ROADMAP.md` — progress updated after each phase
- Phase artifacts — CONTEXT.md, PLANs, SUMMARYs, UAT.md per phase

**After:** All phases complete, milestone ready for audit.
</objective>

<execution_context>
@~/.claude/ez-agents/workflows/run-phase.md
@~/.claude/ez-agents/references/ui-brand.md
</execution_context>

<context>
**Arguments:**
- `start-phase` — Phase number to start from (default: first incomplete phase)
- `--no-discuss` — Skip discuss-phase for all phases
- `--discuss-interactive` — Run discuss-phase without --auto (default: --auto)
- `--no-verify` — Skip verify-work for all phases
- `--yolo` — No pause points, fully autonomous (use at own risk)

**Flags:**
- `--no-discuss` → Skip discuss-phase (langsung plan)
- `--discuss-interactive` → Run discuss-phase with interactive questioning (default: --auto mode)
- `--no-verify` → Skip verify-work (langsung phase berikutnya)
- `--yolo` → No pause, fully autonomous (hati-hati!)

**Default behavior:** discuss-phase runs with --auto flag for autonomous execution.

**Pause Points (unless --yolo):**
1. After discuss-phase: "Continue to plan?"
2. After plan-phase: "Continue to execute?"
3. After execute-phase: "Continue to verify?"
4. After verify-work: "Continue to next phase?"

Project context and phase list are resolved inside the workflow using init commands (`ez-tools.cjs init milestone-op`, `ez-tools.cjs roadmap analyze`).
</context>

<process>
Execute the run-phase workflow end-to-end.

## 0. Initialize Context

```bash
INIT=$(node "$HOME/.claude/ez-agents/bin/ez-tools.cjs" init milestone-op)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Extract from init JSON: `commit_docs`, `planning_path`, `state_path`, `roadmap_path`, `requirements_path`.

Resolve models:
```bash
PLANNER_MODEL=$(node "$HOME/.claude/ez-agents/bin/ez-tools.cjs" resolve-model ez-planner --raw)
EXECUTOR_MODEL=$(node "$HOME/.claude/ez-agents/bin/ez-tools.cjs" resolve-model ez-executor --raw)
VERIFIER_MODEL=$(node "$HOME/.claude/ez-agents/bin/ez-tools.cjs" resolve-model ez-verifier --raw)
```

## 1. Parse Arguments

Extract from $ARGUMENTS:
- `START_PHASE` — Phase number (default: auto-detect first incomplete)
- `NO_DISCUSS` — Boolean (default: false)
- `NO_VERIFY` — Boolean (default: false)
- `YOLO` — Boolean (default: false)

## 2. Validate & Discover Phases

```bash
PHASES_JSON=$(node "$HOME/.claude/ez-agents/bin/ez-tools.cjs" roadmap list-phases)
```

Parse phases from ROADMAP.md. Filter to incomplete phases (no SUMMARY.md).

**If START_PHASE specified:** Start from that phase.
**If not specified:** Start from first incomplete phase.

**If all phases complete:**
```
✓ All phases are already complete!

Next steps:
  /ez:audit-milestone     — Verify all requirements met
  /ez:complete-milestone  — Archive milestone, create git tag
```
Exit.

Display phase list:
```
## Phases to Execute

| Phase | Goal | Status |
|-------|------|--------|
| 1 | Foundation | ⏳ Pending |
| 2 | Authentication | ⏳ Pending |
| 3 | Task CRUD | ✓ Complete |
| 4 | Team Features | ⏳ Pending |

Starting from Phase 1
```

## 3. Execute Phases Iteratively

For each phase from START_PHASE to end:

### Phase Loop

```
═══════════════════════════════════════════════════════
 PHASE {N}: {PHASE_NAME}
═══════════════════════════════════════════════════════

Goal: {PHASE_GOAL from ROADMAP.md}
```

#### Step 1: Discuss (if not skipped)

**If `NO_DISCUSS` is false:**

Check if CONTEXT.md exists:
```bash
if [[ -f ".planning/phases/${PHASE_DIR}/CONTEXT.md" ]]; then
  # Context exists, offer update
  AskUserQuestion:
    header: "Context"
    question: "CONTEXT.md exists. Update or skip?"
    options:
      - "Update context" — Run discuss-phase --auto
      - "Skip (use existing)" — Continue to plan
      - "View existing" — Read CONTEXT.md, then decide
else
  # No context, run discuss --auto
```

**If user chooses to discuss (or no CONTEXT.md exists):**

```
Task(prompt="
<objective>
Discuss Phase {N}: {PHASE_NAME}

Extract implementation decisions that downstream agents need.
Create CONTEXT.md with decisions that guide research and planning.

**Mode:** --auto (Claude picks recommended defaults for autonomous execution)
</objective>

<files_to_read>
- .planning/PROJECT.md
- .planning/REQUIREMENTS.md
- .planning/ROADMAP.md
- .planning/phases/*/CONTEXT.md (prior phases)
</files_to_read>

<phase_info>
Phase {N}: {PHASE_GOAL}
</phase_info>

Write to: .planning/phases/{PHASE_DIR}/CONTEXT.md
", subagent_type="ez-discuss-phase", model="{PLANNER_MODEL}", description="Discuss Phase {N} --auto")
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
    - "Yes, continue" — Proceed to plan-phase
    - "Review context" — Read CONTEXT.md, then decide
    - "Pause here" — Save state, exit
```

**If "Pause here":**
```
Work paused at Phase {N} after discuss.

Resume with:
  /ez:run-phase {N} --no-discuss

Or continue manually:
  /ez:plan-phase {N}
```
Exit.

---

#### Step 2: Plan

```
Task(prompt="
<objective>
Create executable phase plan for Phase {N}: {PHASE_NAME}

Research domain (if needed), create task breakdown, define verification criteria.
</objective>

<files_to_read>
- .planning/PROJECT.md
- .planning/REQUIREMENTS.md
- .planning/phases/{PHASE_DIR}/CONTEXT.md
- .planning/research/SUMMARY.md (if exists)
</files_to_read>

<phase_info>
Phase {N}: {PHASE_GOAL}
</phase_info>

Write to: .planning/phases/{PHASE_DIR}/{N}-PLAN.md
", subagent_type="ez-planner", model="{PLANNER_MODEL}", description="Plan Phase {N}")
```

Display plan summary:
```
## Plan Created — Phase {N}

Tasks:
- Task {N}-01: {task_description}
- Task {N}-02: {task_description}
- Task {N}-03: {task_description}

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
    - "Yes, continue" — Proceed to execute-phase
    - "Review plan" — Read PLAN.md, then decide
    - "Pause here" — Save state, exit
```

**If "Pause here":**
```
Work paused at Phase {N} after plan.

Resume with:
  /ez:run-phase {N} --no-discuss

Or continue manually:
  /ez:execute-phase {N}
```
Exit.

---

#### Step 3: Execute

```
Task(prompt="
<objective>
Execute all plans in Phase {N}: {PHASE_NAME}

Wave-based parallel execution. One commit per task.
Fresh context per subagent.
</objective>

<files_to_read>
- .planning/phases/{PHASE_DIR}/{N}-PLAN.md
- .planning/phases/{PHASE_DIR}/CONTEXT.md
</files_to_read>

<phase_info>
Phase {N}: {PHASE_GOAL}
</phase_info>
", subagent_type="ez-execute-phase", model="{EXECUTOR_MODEL}", description="Execute Phase {N}")
```

Display execution summary:
```
## Execution Complete — Phase {N}

Commits:
- {commit_sha} — Task {N}-01: {task_name}
- {commit_sha} — Task {N}-02: {task_name}
- {commit_sha} — Task {N}-03: {task_name}

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
    - "Yes, continue" — Proceed to verify-work
    - "Skip verification" — Continue to next phase
    - "Pause here" — Save state, exit
```

**If "Pause here":**
```
Work paused at Phase {N} after execute.

Resume with:
  /ez:run-phase {N} --no-discuss --no-verify

Or continue manually:
  /ez:verify-work {N}
```
Exit.

---

#### Step 4: Verify (if not skipped)

**If `NO_VERIFY` is false:**

```
Task(prompt="
<objective>
Verify Phase {N}: {PHASE_NAME}

Manual testing with auto-diagnosis of failures.
Create UAT.md with test results.
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
", subagent_type="ez-verifier", model="{VERIFIER_MODEL}", description="Verify Phase {N}")
```

Display verification summary:
```
## Verification Complete — Phase {N}

Tests: {X} passed, {Y} failed

{If failures:}
⚠ {Y} test(s) failed. Fix plans will be created.
Run /ez:execute-phase {N} --gaps-only after fixing.

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
    - "Yes, continue" — Proceed to next phase
    - "Pause here" — Save state, exit
    - "View progress" — Show updated ROADMAP.md status
```

**If "Pause here":**
```
Work paused after Phase {N} complete.

Resume with:
  /ez:run-phase {N+1}

Or continue manually:
  /ez:plan-phase {N+1}
```
Exit.

**If "View progress":**
```bash
node "$HOME/.claude/ez-agents/bin/ez-tools.cjs" progress --brief
```
Then ask again: "Continue to Phase {N+1}?"

---

#### Update State

After each phase complete:
```bash
node "$HOME/.claude/ez-agents/bin/ez-tools.cjs" state update-phase-complete --phase={N}
```

Update ROADMAP.md status:
```bash
node "$HOME/.claude/ez-agents/bin/ez-tools.cjs" roadmap update-phase-status --phase={N} --status=complete
```

**If `commit_docs` is true:**
```bash
git add .planning/STATE.md .planning/ROADMAP.md
git commit -m "docs: complete Phase {N} — {PHASE_NAME}"
```

---

### Display Phase Complete Banner

```
═══════════════════════════════════════════════════════
 ✓ PHASE {N} COMPLETE
═══════════════════════════════════════════════════════

Summary: {PHASE_SUMMARY from SUMMARY.md}

Progress: {X}/{TOTAL} phases complete
```

---

## 4. All Phases Complete

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

## 5. Error Handling

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

## 6. Stuck Detection

Start stuck watcher at beginning:
```bash
node "$HOME/.claude/ez-agents/bin/ez-tools.cjs" stuck-watch start \
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

</process>

<success_criteria>
- [ ] Phases discovered from ROADMAP.md
- [ ] Starting phase validated (exists and incomplete)
- [ ] Each phase executed: discuss → plan → execute → verify
- [ ] Pause points respected (unless --yolo)
- [ ] STATE.md updated after each phase
- [ ] ROADMAP.md progress updated
- [ ] User knows next steps after completion or pause
</success_criteria>

<examples>

## Start from first incomplete phase (default --auto mode)

```
/ez:run-phase
```

## Start from specific phase

```
/ez:run-phase 2
```

## Interactive discuss-phase (choose gray areas manually)

```
/ez:run-phase 3 --discuss-interactive
```

## Skip discussion (CONTEXT.md already exists)

```
/ez:run-phase 3 --no-discuss
```

## Skip verification (trust execution)

```
/ez:run-phase 1 --no-verify
```

## Fully autonomous (no pauses)

```
/ez:run-phase 1 --yolo
```

## Combined flags

```
/ez:run-phase 2 --no-discuss --no-verify
```

</examples>

<related_commands>
- `/ez:autonomous` — Fully autonomous, no pause points
- `/ez:discuss-phase` — Discuss single phase
- `/ez:plan-phase` — Plan single phase
- `/ez:execute-phase` — Execute single phase
- `/ez:verify-work` — Verify single phase
- `/ez:progress` — Check project progress
</related_commands>
