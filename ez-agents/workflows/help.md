<purpose>
Display the complete EZ Agents command reference. Output ONLY the reference content. Do NOT add project-specific analysis, git status, next-step suggestions, or any commentary beyond the reference.
</purpose>

<reference>
# EZ Agents Command Reference

**EZ Agents** — Meta-prompting & Agent Orchestration, but ez. Creates hierarchical project plans optimized for solo agentic development with Claude Code, OpenCode, Gemini, Codex, and Copilot.

## Quick Start

### Lean Agile Flow (Recommended)
1. `/ez:new-project` - Initialize project (requirements + roadmap)
2. `/ez:run-phase 1` - Run all phases iteratively with pause points
3. `/ez:audit-milestone` - Verify all requirements met
4. `/ez:complete-milestone` - Archive and tag release

### Manual Control Flow
1. `/ez:new-project` - Initialize project
2. `/ez:discuss-phase 1` - Optional: clarify approach
3. `/ez:plan-phase 1` - Create task breakdown
4. `/ez:execute-phase 1` - Build the plan
5. `/ez:verify-work 1` - Test it works

## Core Workflow

```
/ez:new-project → /ez:run-phase → /ez:audit-milestone → /ez:complete-milestone
```

Or with manual control:

```
/ez:new-project → /ez:discuss-phase → /ez:plan-phase → /ez:execute-phase → /ez:verify-work → repeat
```

### Project Initialization

**`/ez:new-project`**
Initialize new project through unified flow.

One command takes you from idea to ready-for-planning:
- Deep questioning to understand what you're building
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with v1/v2/out-of-scope scoping
- Roadmap creation with phase breakdown and success criteria

Creates all `.planning/` artifacts:
- `PROJECT.md` — vision and requirements
- `config.json` — workflow mode (interactive/yolo)
- `research/` — domain research (if selected)
- `REQUIREMENTS.md` — scoped requirements with REQ-IDs
- `ROADMAP.md` — phases mapped to requirements
- `STATE.md` — project memory

Usage: `/ez:new-project`

**`/ez:map-codebase`**
Map an existing codebase for brownfield projects.

- Analyzes codebase with parallel Explore agents
- Creates `.planning/codebase/` with 7 focused documents
- Covers stack, architecture, structure, conventions, testing, integrations, concerns
- Use before `/ez:new-project` on existing codebases

Usage: `/ez:map-codebase`

### Iterative Execution (NEW!)

**`/ez:run-phase [start-phase]`**
**NEW!** Run all phases iteratively with pause points for approval.

Execute all phases from a starting point: discuss → plan → execute → verify, with user approval between each step. Auto-advances to next phase after completion.

- **Pause points** (unless `--yolo`):
  - After discuss: "Continue to plan?"
  - After plan: "Continue to execute?"
  - After execute: "Continue to verify?"
  - After verify: "Continue to next phase?"
- **Auto-tracks progress** in STATE.md and ROADMAP.md
- **Resume support**: Stop anytime, resume with `/ez:run-phase [N]`

**Flags:**
- `--no-discuss` — Skip discuss-phase for all phases
- `--no-verify` — Skip verify-work for all phases
- `--yolo` — No pause points, fully autonomous (use at own risk)

Usage: `/ez:run-phase` (start from first incomplete phase)
Usage: `/ez:run-phase 1` (start from phase 1)
Usage: `/ez:run-phase 2 --no-discuss` (skip discussion)
Usage: `/ez:run-phase 1 --yolo` (fully autonomous)

### Phase Planning

**`/ez:discuss-phase <number>`**
Help articulate your vision for a phase before planning.

- Captures how you imagine this phase working
- Creates CONTEXT.md with your vision, essentials, and boundaries
- Use when you have ideas about how something should look/feel
- Optional `--batch` asks 2-5 related questions at a time instead of one-by-one

Usage: `/ez:discuss-phase 2`
Usage: `/ez:discuss-phase 2 --batch`
Usage: `/ez:discuss-phase 2 --batch=3`

**`/ez:plan-phase <number>`**
Create detailed execution plan for a specific phase.

- Generates `.planning/phases/XX-phase-name/XX-YY-PLAN.md`
- Breaks phase into concrete, actionable tasks
- Includes verification criteria and success measures
- Multiple plans per phase supported (XX-01, XX-02, etc.)

Usage: `/ez:plan-phase 1`
Result: Creates `.planning/phases/01-foundation/01-01-PLAN.md`

**PRD Express Path:** Pass `--prd path/to/requirements.md` to skip discuss-phase entirely. Your PRD becomes locked decisions in CONTEXT.md. Useful when you already have clear acceptance criteria.

### Execution

**`/ez:execute-phase <phase-number>`**
Execute all plans in a phase.

- Groups plans by wave (from frontmatter), executes waves sequentially
- Plans within each wave run in parallel via Task tool
- Verifies phase goal after all plans complete
- Updates REQUIREMENTS.md, ROADMAP.md, STATE.md

Usage: `/ez:execute-phase 5`

### Quick Mode

**`/ez:quick`**
Execute small, ad-hoc tasks with EZ guarantees but skip optional agents.

Quick mode uses the same system with a shorter path:
- Spawns planner + executor (skips researcher, checker, verifier)
- Quick tasks live in `.planning/quick/` separate from planned phases
- Updates STATE.md tracking (not ROADMAP.md)

Use when you know exactly what to do and the task is small enough to not need research or verification.

Usage: `/ez:quick`
Result: Creates `.planning/quick/NNN-slug/PLAN.md`, `.planning/quick/NNN-slug/SUMMARY.md`

### Milestone Management

**`/ez:new-milestone <name>`**
Start a new milestone through unified flow.

- Deep questioning to understand what you're building next
- Optional domain research (spawns 4 parallel researcher agents)
- Requirements definition with scoping
- Roadmap creation with phase breakdown

Mirrors `/ez:new-project` flow for brownfield projects (existing PROJECT.md).

Usage: `/ez:new-milestone "v2.0 Features"`

**`/ez:complete-milestone <version>`**
Archive completed milestone and prepare for next version.

- Creates MILESTONES.md entry with stats
- Archives full details to milestones/ directory
- Creates git tag for the release
- Prepares workspace for next version

Usage: `/ez:complete-milestone 1.0.0`

### Progress Tracking

**`/ez:progress`**
Check project status and intelligently route to next action.

- Shows visual progress bar and completion percentage
- Summarizes recent work from SUMMARY files
- Displays current position and what's next
- Lists key decisions and open issues
- Offers to execute next plan or create it if missing
- Detects 100% milestone completion

Usage: `/ez:progress`

### Session Management

**`/ez:resume-work`**
Resume work from previous session with full context restoration.

- Reads STATE.md for project context
- Shows current position and recent progress
- Offers next actions based on project state

Usage: `/ez:resume-work`

### Debugging

**`/ez:debug [issue description]`**
Systematic debugging with persistent state across context resets.

- Gathers symptoms through adaptive questioning
- Creates `.planning/debug/[slug].md` to track investigation
- Investigates using scientific method (evidence → hypothesis → test)
- Survives `/clear` — run `/ez:debug` with no args to resume
- Archives resolved issues to `.planning/debug/resolved/`

Usage: `/ez:debug "login button doesn't work"`
Usage: `/ez:debug` (resume active session)

### User Acceptance Testing

**`/ez:verify-work [phase]`**
Validate built features through conversational UAT.

- Extracts testable deliverables from SUMMARY.md files
- Presents tests one at a time (yes/no responses)
- Automatically diagnoses failures and creates fix plans
- Ready for re-execution if issues found

Usage: `/ez:verify-work 3`

### Milestone Auditing

**`/ez:audit-milestone [version]`**
Audit milestone completion against original intent.

- Reads all phase VERIFICATION.md files
- Checks requirements coverage
- Spawns integration checker for cross-phase wiring
- Creates MILESTONE-AUDIT.md with gaps and tech debt

Usage: `/ez:audit-milestone`

### Configuration

**`/ez:settings`**
Configure workflow toggles and model profile interactively.

- Toggle researcher, plan checker, verifier agents
- Select model profile (quality/balanced/budget)
- Updates `.planning/config.json`

Usage: `/ez:settings`

### Utility Commands

**`/ez:help`**
Show this command reference.

**`/ez:update`**
Update EZ Agents to latest version with changelog preview.

- Shows installed vs latest version comparison
- Displays changelog entries for versions you've missed
- Highlights breaking changes
- Confirms before running install
- Better than raw `npx ez-agents`

Usage: `/ez:update`

## Files & Structure

```
.planning/
├── PROJECT.md            # Project vision
├── ROADMAP.md            # Current phase breakdown
├── STATE.md              # Project memory & context
├── RETROSPECTIVE.md      # Living retrospective (updated per milestone)
├── config.json           # Workflow mode & gates
├── todos/                # Captured ideas and tasks
│   ├── pending/          # Todos waiting to be worked on
│   └── done/             # Completed todos
├── debug/                # Active debug sessions
│   └── resolved/         # Archived resolved issues
├── milestones/
│   ├── v1.0-ROADMAP.md       # Archived roadmap snapshot
│   ├── v1.0-REQUIREMENTS.md  # Archived requirements
│   └── v1.0-phases/          # Archived phase dirs (via /ez:cleanup or --archive-phases)
│       ├── 01-foundation/
│       └── 02-core-features/
├── codebase/             # Codebase map (brownfield projects)
│   ├── STACK.md          # Languages, frameworks, dependencies
│   ├── ARCHITECTURE.md   # Patterns, layers, data flow
│   ├── STRUCTURE.md      # Directory layout, key files
│   ├── CONVENTIONS.md    # Coding standards, naming
│   ├── TESTING.md        # Test setup, patterns
│   ├── INTEGRATIONS.md   # External services, APIs
│   └── CONCERNS.md       # Tech debt, known issues
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   └── 01-01-SUMMARY.md
    └── 02-core-features/
        ├── 02-01-PLAN.md
        └── 02-01-SUMMARY.md
```

## Workflow Modes

Set during `/ez:new-project`:

**Interactive Mode**

- Confirms each major decision
- Pauses at checkpoints for approval
- More guidance throughout

**YOLO Mode**

- Auto-approves most decisions
- Executes plans without confirmation
- Only stops for critical checkpoints

Change anytime by editing `.planning/config.json`

## Planning Configuration

Configure how planning artifacts are managed in `.planning/config.json`:

**`planning.commit_docs`** (default: `true`)
- `true`: Planning artifacts committed to git (standard workflow)
- `false`: Planning artifacts kept local-only, not committed

When `commit_docs: false`:
- Add `.planning/` to your `.gitignore`
- Useful for OSS contributions, client projects, or keeping planning private
- All planning files still work normally, just not tracked in git

**`planning.search_gitignored`** (default: `false`)
- `true`: Add `--no-ignore` to broad ripgrep searches
- Only needed when `.planning/` is gitignored and you want project-wide searches to include it

Example config:
```json
{
  "planning": {
    "commit_docs": false,
    "search_gitignored": true
  }
}
```

## Common Workflows

**Starting a new project:**

```
/ez:new-project        # Unified flow: questioning → product discovery → requirements → roadmap
/ez:product-discovery  # Product discovery: personas, problem validation, metrics, prioritization
/ez:new-milestone      # Start next milestone (uses product requirements)
/clear
/ez:plan-phase 1       # Create plans for first phase
/clear
/ez:execute-phase 1    # Execute all plans in phase
```

**Resuming work after a break:**

```
/ez:progress  # See where you left off and continue
```

**Adding urgent mid-milestone work:**

```
/ez:insert-phase 5 "Critical security fix"
/ez:plan-phase 5.1
/ez:execute-phase 5.1
```

**Completing a milestone:**

```
/ez:complete-milestone 1.0.0
/clear
/ez:new-milestone  # Start next milestone (questioning → research → requirements → roadmap)
```

**Capturing ideas during work:**

```
/ez:add-todo                    # Capture from conversation context
/ez:add-todo Fix modal z-index  # Capture with explicit description
/ez:check-todos                 # Review and work on todos
/ez:check-todos api             # Filter by area
```

**Debugging an issue:**

```
/ez:debug "form submission fails silently"  # Start debug session
# ... investigation happens, context fills up ...
/clear
/ez:debug                                    # Resume from where you left off
```

## Global Flags

Flags below apply to all core commands (`execute-phase`, `plan-phase`, `release`, `progress`):

| Flag | Effect |
|---|---|
| `--no-auto` | Disable all auto-invocations. Expert mode. |
| `--verbose` | Show detail for every auto-invocation step. |
| `--skip-discussion` | Skip discuss-phase only (more granular than --no-auto). |

## Smart Orchestration

Core commands automatically invoke helper commands based on context:

- `/ez:execute-phase N` → auto: health check (pre), verify-work (post)
- `/ez:plan-phase N` → auto: discuss-phase if phase touches a sensitive area (auth, DB, payment, etc.)
- `/ez:release tier ver` → auto: verify-work (medium+), audit-milestone + arch-review (enterprise)
- `/ez:progress` → auto: health check (silent on pass)

All auto-invocations appear with `[auto]` prefix in output.

Disable globally: set `"smart_orchestration": { "enabled": false }` in `.planning/config.json`.
Disable per-command: append `--no-auto` flag.

## Flags

### --skip-discussion
Skips the DISCUSSION.md pre-flight check and proceeds directly to execution.

Usage: ez execute-phase <phase> --skip-discussion

⚠️ Warning: Pre-flight discussion skipped via --skip-discussion

### Migration Guide (v2.x → v3.0)
If upgrading from v2.x:
- `agent_discussion` is now enabled by default (was disabled)
- Use `--skip-discussion` to preserve v2.x behavior during transition
- Set `"agent_discussion": { "enabled": false }` in config.json to permanently disable

### Migration Note (v3.x → Smart Orchestration)
If upgrading from v3.x without smart orchestration and the new behavior is not desired, two options:
1. Add `--no-auto` to frequently used commands
2. Set `"smart_orchestration": { "enabled": false }` in `.planning/config.json`

## Getting Help

- Read `.planning/PROJECT.md` for project vision
- Read `.planning/STATE.md` for current context
- Check `.planning/ROADMAP.md` for phase status
- Run `/ez:progress` to check where you're up to
</reference>
