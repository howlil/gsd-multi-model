<purpose>

Start a new milestone cycle for an existing project. Loads project context, gathers milestone goals (from MILESTONE-CONTEXT.md or conversation), updates PROJECT.md and STATE.md, optionally runs parallel research, defines scoped requirements with REQ-IDs, spawns the roadmapper to create phased execution plan, and commits all artifacts. Brownfield equivalent of new-project.

**GSD-2 Enhanced:** Includes crash recovery, cost tracking, fresh context, and stuck detection for production-grade reliability.

</purpose>

<required_reading>

Read all files referenced by the invoking prompt's execution_context before starting.

</required_reading>

<process>

## 0. Pre-Flight Health Check (GSD-2 Pattern)

**MANDATORY FIRST STEP — Validate environment before ANY operation:**

```bash
# Run health check
HEALTH=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" doctor --json)
```

**Check:**
- ✅ Node.js version >= 16.7.0
- ✅ AI tools available (Claude, OpenCode, etc.)
- ✅ Config valid (`.planning/config.json`)
- ✅ Git repo initialized
- ✅ API keys configured

**If any check fails:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► HEALTH CHECK FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ [Failed check description]

Fix:
  [suggested command]

Example:
  $ [example command]

Resolve before continuing with milestone initialization.
```

**Abort milestone init until resolved.**

---

## 0a. Gather Initial Context (CONTEXT-01, CONTEXT-02)

**Context gathering is handled by ez-project-researcher:**

```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" init new-milestone
```

This loads project context, STATE.md, and ROADMAP.md automatically.

**Context includes:**
- `.planning/PROJECT.md` — Project description
- `.planning/STATE.md` — Current position
- `.planning/ROADMAP.md` — Phase structure
```

**Agent can request additional context using:**
- `ez-tools context read <pattern>` — Read local files
- `ez-tools context fetch <url>` — Fetch URL content (requires user confirmation)

**Update STATE.md with context sources:**

```javascript
await contextManager.updateStateMd();
```

**Continue to Load Context (Step 1) with gathered context.**

---

## 1. Load Context

Read PROJECT.md (existing project, validated requirements, decisions)
Read MILESTONES.md (what shipped previously)
Read STATE.md (pending todos, blockers)
Check for MILESTONE-CONTEXT.md (from /ez:discuss-milestone)

---

## 1a. Initialize Milestone Cost Tracking (GSD-2 Pattern)

**Create/Update metrics.json:**

```bash
# Initialize milestone budget
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" cost-init \
  --milestone="v[X.Y]" \
  --budget-ceiling=50.00 \
  --alert-threshold=0.8
```

**Create `.planning/metrics.json`:**
```json
{
  "milestone": "v[X.Y]",
  "started_at": "2026-03-18T12:00:00.000Z",
  "budget": {
    "ceiling": 50.00,
    "alert_threshold": 0.8,
    "projected": 0.00,
    "spent": 0.00
  },
  "phases": {},
  "cumulative": {
    "total_tokens": 0,
    "total_cost_usd": 0.00,
    "by_provider": {}
  }
}
```

**Display budget info:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► MILESTONE BUDGET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Milestone: v[X.Y]
Budget Ceiling: $50.00
Alert Threshold: 80% ($40.00)

You will be warned when spending reaches 80% of budget.
Auto-pause at $50.00.

View anytime: /ez:cost
```

**Commit metrics.json:**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" commit "chore: initialize milestone budget" --files .planning/metrics.json
```

---

## 2. Gather Milestone Goals

**If MILESTONE-CONTEXT.md exists:**
- Use features and scope from discuss-milestone
- Present summary for confirmation

**If no context file:**
- Present what shipped in last milestone
- Ask inline (freeform, NOT AskUserQuestion): "What do you want to build next?"
- Wait for their response, then use AskUserQuestion to probe specifics
- If user selects "Other" at any point to provide freeform input, ask follow-up as plain text — not another AskUserQuestion

---

## 2a. Create Lock File (GSD-2 Pattern)

**Before any major operation:**

```bash
# Create auto.lock
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" lock-create \
  --operation="new-milestone" \
  --milestone="v[X.Y]"
```

**Create `.planning/auto.lock`:**
```json
{
  "pid": 12345,
  "operation": "new-milestone",
  "milestone": "v[X.Y]",
  "started_at": "2026-03-18T12:00:00.000Z",
  "last_heartbeat": "2026-03-18T12:00:00.000Z",
  "state": "gathering_goals"
}
```

**Update heartbeat every 5 minutes:**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" lock-heartbeat
```

**On completion:**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" lock-release
```

**On crash/restart:**
- Detect orphaned lock (PID dead)
- Synthesize recovery briefing
- Resume from last known state

---

## 3. Determine Milestone Version

- Parse last version from MILESTONES.md
- Suggest next version (v1.0 → v1.1, or v2.0 for major)
- Confirm with user

---

## 4. Update PROJECT.md

Add/update:

```markdown
## Current Milestone: v[X.Y] [Name]

**Goal:** [One sentence describing milestone focus]

**Target features:**
- [Feature 1]
- [Feature 2]
- [Feature 3]
```

Update Active requirements section and "Last updated" footer.

---

## 5. Update STATE.md

```markdown
## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: [today] — Milestone v[X.Y] started
```

Keep Accumulated Context section from previous milestone.

---

## 6. Cleanup and Commit

Delete MILESTONE-CONTEXT.md if exists (consumed).

```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" commit "docs: start milestone v[X.Y] [Name]" --files .planning/PROJECT.md .planning/STATE.md .planning/metrics.json
```

**Update lock file state:**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" lock-update --state="context_loaded"
```

---

## 7. Load Context and Resolve Models

```bash
INIT=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" init new-milestone)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Extract from init JSON: `researcher_model`, `synthesizer_model`, `roadmapper_model`, `commit_docs`, `research_enabled`, `current_milestone`, `project_exists`, `roadmap_exists`.

---

## 8. Research Decision

AskUserQuestion: "Research the domain ecosystem for new features before defining requirements?"
- "Research first (Recommended)" — Discover patterns, features, architecture for NEW capabilities
- "Skip research" — Go straight to requirements

**Persist choice to config** (so future `/ez:plan-phase` honors it):

```bash
# If "Research first": persist true
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" config-set workflow.research true

# If "Skip research": persist false
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" config-set workflow.research false
```

**Update lock file state:**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" lock-update --state="research_decision"
```

**If "Research first":**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► RESEARCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning 4 researchers in parallel...
  → Stack, Features, Architecture, Pitfalls
```

```bash
mkdir .planning/research
```

**Spawn 4 parallel ez-project-researcher agents with FRESH CONTEXT (GSD-2 Pattern):**

Each uses this template with dimension-specific fields:

**Common structure for all 4 researchers:**
```
Task(prompt="
<research_type>Project Research — {DIMENSION} for [new features].</research_type>

<fresh_context>
CONTEXT RESET: This is a fresh 200K session.
No accumulated garbage from prior tasks.
Only relevant context pre-loaded below.
</fresh_context>

<pre_loaded_context>
- .planning/PROJECT.md excerpt (core value, milestone goals)
- .planning/REQUIREMENTS.md excerpt (active requirements)
- .planning/ROADMAP.md excerpt (phase structure)
</pre_loaded_context>

<milestone_context>
SUBSEQUENT MILESTONE — Adding [target features] to existing app.
{EXISTING_CONTEXT}
Focus ONLY on what's needed for the NEW features.
</milestone_context>

<question>{QUESTION}</question>

<files_to_read>
- .planning/PROJECT.md (Project context)
</files_to_read>

<downstream_consumer>{CONSUMER}</downstream_consumer>

<quality_gate>{GATES}</quality_gate>

<output>
Write to: .planning/research/{FILE}
Use template: ~/.claude/ez-agents/templates/research-project/{FILE}
</output>
", subagent_type="ez-project-researcher", model="{researcher_model}", description="{DIMENSION} research")
```

**Dimension-specific fields:**

| Field | Stack | Features | Architecture | Pitfalls |
|-------|-------|----------|-------------|----------|
| EXISTING_CONTEXT | Existing validated capabilities (DO NOT re-research): [from PROJECT.md] | Existing features (already built): [from PROJECT.md] | Existing architecture: [from PROJECT.md or codebase map] | Focus on common mistakes when ADDING these features to existing system |
| QUESTION | What stack additions/changes are needed for [new features]? | How do [target features] typically work? Expected behavior? | How do [target features] integrate with existing architecture? | Common mistakes when adding [target features] to [domain]? |
| CONSUMER | Specific libraries with versions for NEW capabilities, integration points, what NOT to add | Table stakes vs differentiators vs anti-features, complexity noted, dependencies on existing | Integration points, new components, data flow changes, suggested build order | Warning signs, prevention strategy, which phase should address it |
| GATES | Versions current (verify with Context7), rationale explains WHY, integration considered | Categories clear, complexity noted, dependencies identified | Integration points identified, new vs modified explicit, build order considers deps | Pitfalls specific to adding these features, integration pitfalls covered, prevention actionable |
| FILE | STACK.md | FEATURES.md | ARCHITECTURE.md | PITFALLS.md |

After all 4 complete, spawn synthesizer:

```
Task(prompt="
Synthesize research outputs into SUMMARY.md.

<files_to_read>
- .planning/research/STACK.md
- .planning/research/FEATURES.md
- .planning/research/ARCHITECTURE.md
- .planning/research/PITFALLS.md
</files_to_read>

Write to: .planning/research/SUMMARY.md
Use template: ~/.claude/ez-agents/templates/research-project/SUMMARY.md
Commit after writing.
", subagent_type="ez-phase-researcher", model="{synthesizer_model}", description="Synthesize research")
```

Display key findings from SUMMARY.md:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► RESEARCH COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Stack additions:** [from SUMMARY.md]
**Feature table stakes:** [from SUMMARY.md]
**Watch Out For:** [from SUMMARY.md]
```

**Update lock file state:**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" lock-update --state="research_complete"
```

**If "Skip research":** Continue to Step 9.

---

## 9. Define Requirements

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► DEFINING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Read PROJECT.md: core value, current milestone goals, validated requirements (what exists).

**If research exists:** Read FEATURES.md, extract feature categories.

Present features by category:
```
## [Category 1]
**Table stakes:** Feature A, Feature B
**Differentiators:** Feature C, Feature D
**Research notes:** [any relevant notes]
```

**If no research:** Gather requirements through conversation. Ask: "What are the main things users need to do with [new features]?" Clarify, probe for related capabilities, group into categories.

**Scope each category** via AskUserQuestion (multiSelect: true, header max 12 chars):
- "[Feature 1]" — [brief description]
- "[Feature 2]" — [brief description]
- "None for this milestone" — Defer entire category

Track: Selected → this milestone. Unselected table stakes → future. Unselected differentiators → out of scope.

**Identify gaps** via AskUserQuestion:
- "No, research covered it" — Proceed
- "Yes, let me add some" — Capture additions

**Generate REQUIREMENTS.md:**
- v1 Requirements grouped by category (checkboxes, REQ-IDs)
- Future Requirements (deferred)
- Out of Scope (explicit exclusions with reasoning)
- Traceability section (empty, filled by roadmap)

**REQ-ID format:** `[CATEGORY]-[NUMBER]` (AUTH-01, NOTIF-02). Continue numbering from existing.

**Requirement quality criteria:**

Good requirements are:
- **Specific and testable:** "User can reset password via email link" (not "Handle password reset")
- **User-centric:** "User can X" (not "System does Y")
- **Atomic:** One capability per requirement (not "User can login and manage profile")
- **Independent:** Minimal dependencies on other requirements

Present FULL requirements list for confirmation:

```
## Milestone v[X.Y] Requirements

### [Category 1]
- [ ] **CAT1-01**: User can do X
- [ ] **CAT1-02**: User can do Y

### [Category 2]
- [ ] **CAT2-01**: User can do Z

Does this capture what you're building? (yes / adjust)
```

If "adjust": Return to scoping.

**Commit requirements:**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" commit "docs: define milestone v[X.Y] requirements" --files .planning/REQUIREMENTS.md
```

**Update lock file state:**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" lock-update --state="requirements_defined"
```

---

## 10. Create Roadmap (with Stuck Detection - GSD-2 Pattern)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► CREATING ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

◆ Spawning roadmapper...
```

**Initialize stuck detection:**

```bash
# Start stuck watcher
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" stuck-watch start \
  --operation="roadmap-creation" \
  --max-retries=1 \
  --timeout=300
```

**Starting phase number:** Read MILESTONES.md for last phase number. Continue from there (v1.0 ended at phase 5 → v1.1 starts at phase 6).

```
Task(prompt="
<planning_context>
<files_to_read>
- .planning/PROJECT.md
- .planning/REQUIREMENTS.md
- .planning/research/SUMMARY.md (if exists)
- .planning/config.json
- .planning/MILESTONES.md
</files_to_read>
</planning_context>

<instructions>
Create roadmap for milestone v[X.Y]:
1. Start phase numbering from [N]
2. Derive phases from THIS MILESTONE's requirements only
3. Map every requirement to exactly one phase
4. Derive 2-5 success criteria per phase (observable user behaviors)
5. Validate 100% coverage
6. Write files immediately (ROADMAP.md, STATE.md, update REQUIREMENTS.md traceability)
7. Return ROADMAP CREATED with summary

Write files first, then return.
</instructions>
", subagent_type="ez-roadmapper", model="{roadmapper_model}", description="Create roadmap")
```

**Handle return:**

**If `## ROADMAP BLOCKED`:**
1. Log error type and location
2. Retry ONCE with diagnostic context:
```
Task(prompt="
<retry_context>
PREVIOUS ATTEMPT FAILED
Error Type: [error_type]
Error Location: [location]
Suggested Fix: [fix]

CONTEXT SNAPSHOT FOR DEBUGGING:
[snapshot of files read]

Please try again with this diagnostic information.
</retry_context>
", subagent_type="ez-roadmapper", model="{roadmapper_model}", description="Create roadmap (retry)")
```
3. If fails again → STOP with exact failure report:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► ROADMAP CREATION FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error Type: [type]
Error Location: [file:line]
Suggested Fix: [action]

Debug: Run `/ez:debug` to see current session state

Next Steps:
1. Review error details
2. Fix [specific issue]
3. Run: /ez:plan-milestone --retry
```

**If `## ROADMAP CREATED`:** Read ROADMAP.md, present inline:

```
## Proposed Roadmap

**[N] phases** | **[X] requirements mapped** | All covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| [N] | [Name] | [Goal] | [REQ-IDs] | [count] |

### Phase Details

**Phase [N]: [Name]**
Goal: [goal]
Requirements: [REQ-IDs]
Success criteria:
1. [criterion]
2. [criterion]
```

**Ask for approval** via AskUserQuestion:
- "Approve" — Commit and continue
- "Adjust phases" — Tell me what to change
- "Review full file" — Show raw ROADMAP.md

**If "Adjust":** Get notes, re-spawn roadmapper with revision context, loop until approved.
**If "Review":** Display raw ROADMAP.md, re-ask.

**Commit roadmap** (after approval):
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" commit "docs: create milestone v[X.Y] roadmap ([N] phases)" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md
```

**Update lock file state:**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" lock-update --state="roadmap_created"
```

---

## 11. Release Lock File

**Milestone initialization complete:**

```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" lock-release
```

---

## 12. Post-Milestone Cost Report (GSD-2 Pattern)

**After all commits complete:**

```bash
# Generate cost report
COST_REPORT=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" cost-report \
  --milestone="v[X.Y]" \
  --format=summary)
```

**Display:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► MILESTONE INITIALIZATION COST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Milestone: v[X.Y]
Phases: [N]
Requirements: [X]

Initialization Cost:
- Research: $[X.XX] ([N] tokens)
- Requirements: $[X.XX] ([N] tokens)
- Roadmap: $[X.XX] ([N] tokens)
- Total: $[X.XX] ([N] tokens)

Budget Remaining: $[XX.XX] of $[XX.XX]

Projected Total (based on similar milestones): $[XX.XX]

View detailed report: /ez:cost --milestone=v[X.Y]
```

---

## 13. Done

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► MILESTONE INITIALIZED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Milestone v[X.Y]: [Name]**

| Artifact       | Location                    |
|----------------|-----------------------------|
| Project        | `.planning/PROJECT.md`      |
| Research       | `.planning/research/`       |
| Requirements   | `.planning/REQUIREMENTS.md` |
| Roadmap        | `.planning/ROADMAP.md`      |
| Metrics        | `.planning/metrics.json`    |

**[N] phases** | **[X] requirements** | Ready to build ✓

## ▶ Next Up

**Phase [N]: [Phase Name]** — [Goal]

`/ez:discuss-phase [N]` — gather context and clarify approach

<sub>`/clear` first → fresh context window</sub>

Also: `/ez:plan-phase [N]` — skip discussion, plan directly
```

</process>

<success_criteria>
- [ ] Pre-flight health check passed (all systems go)
- [ ] Cost tracking initialized (metrics.json created)
- [ ] Lock file created and maintained throughout
- [ ] PROJECT.md updated with Current Milestone section
- [ ] STATE.md reset for new milestone
- [ ] MILESTONE-CONTEXT.md consumed and deleted (if existed)
- [ ] Research completed (if selected) — 4 parallel agents, milestone-aware, fresh context
- [ ] Requirements gathered and scoped per category
- [ ] REQUIREMENTS.md created with REQ-IDs
- [ ] ez-roadmapper spawned with phase numbering context
- [ ] Stuck detection active during roadmap creation
- [ ] Roadmap files written immediately (not draft)
- [ ] User feedback incorporated (if any)
- [ ] ROADMAP.md phases continue from previous milestone
- [ ] All commits made (if planning docs committed)
- [ ] Lock file released on completion
- [ ] Cost report displayed
- [ ] User knows next step: `/ez:discuss-phase [N]`

**Atomic commits:** Each phase commits its artifacts immediately.

**GSD-2 Reliability:**
- ✅ Crash recovery via lock files
- ✅ Cost transparency via metrics.json
- ✅ Fresh context per researcher/agent
- ✅ Stuck detection with diagnostics
- ✅ Health check pre-flight validation
</success_criteria>
