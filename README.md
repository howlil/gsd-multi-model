<div align="center">

# EZ Agents

**ez-agents** — *Meta-prompting & Agent Orchestration, but ez*

**English** · [简体中文](README.zh-CN.md)

**An independent fork of GSD with multi-model support (Qwen, Kimi, OpenAI, Claude) and enhanced reliability features.**

**Solves context rot — with added security, error handling, and cross-platform support.**

[![GitHub forks](https://img.shields.io/github/forks/howlil/ez-agents?style=for-the-badge&logo=github&color=blue)](https://github.com/howlil/ez-agents/network)
[![GitHub stars](https://img.shields.io/github/stars/howlil/ez-agents?style=for-the-badge&logo=github&color=yellow)](https://github.com/howlil/ez-agents/stargazers)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

<br>

```bash
npx github:howlil/ez-agents
```

**Works on Mac, Windows, and Linux.**

<br>

**Original GSD by** [TÂCHES](https://github.com/glittercowboy/get-shit-done) | **EZ Agents Fork by** [@howlil](https://github.com/howlil)

<br>

*"If you know clearly what you want, this WILL build it for you. No bs."*

*"I've done SpecKit, OpenSpec and Taskmaster — this has produced the best results for me."*

*"By far the most powerful addition to my Claude Code. Nothing over-engineered. Literally ez mode activated."*

<br>

[Features](#-whats-new-in-ez-agents) · [Install](#install) · [Commands](#commands) · [Multi-Model](#multi-model-support) · [User Guide](docs/USER-GUIDE.md)

</div>

---

## 🚀 What's New in EZ Agents

> **Note:** This is an **independent fork** of GSD. Not affiliated with the original GSD project.
>
> **Original GSD:** [glittercowboy/get-shit-done](https://github.com/glittercowboy/get-shit-done) by TÂCHES
>
> **This Fork:** [howlil/ez-agents](https://github.com/howlil/ez-agents) with multi-model support & enhancements

**EZ Agents** adds **multi-model support** and **enterprise-grade reliability** to GSD.

### Why This Fork Exists

I needed GSD to work with multiple AI providers (not just Anthropic) and run reliably on Windows. This fork adds:

- 🌍 **Multi-Model**: Qwen (Alibaba), Kimi (Moonshot), OpenAI, and Anthropic
- 🔒 **Security**: Command injection prevention, path validation, audit logging
- 🛡️ **Error Handling**: Retry with backoff, circuit breaker for failing operations
- 🪟 **Windows Support**: Cross-platform file utilities (no Unix dependencies)
- 🔄 **Easy Updates**: `ez-agents-update` command to stay current

### Features Comparison

| Feature | Original GSD | EZ Agents Fork |
|---------|--------------|-----------|
| **Multi-Model** | Anthropic only | ✓ Anthropic, Qwen, Kimi, OpenAI |
| **Security** | Basic | ✓ Command allowlist, path validation, audit log |
| **Error Handling** | Basic | ✓ Retry with backoff, circuit breaker |
| **Cross-Platform** | Unix commands | ✓ Pure JavaScript (Windows-safe) |
| **Git Safety** | Direct calls | ✓ Atomic commits, branch automation |
| **Update Command** | Manual npm | ✓ `ez-agents-update` |
| **Credential Storage** | Plain text | ✓ System keychain (keytar) |

### 17 New Libraries

```
get-shit-done/bin/lib/
├── safe-exec.cjs         # Command injection prevention (allowlist + validation)
├── safe-path.cjs         # Path traversal prevention
├── auth.cjs              # Secure credential storage (keytar + fallback)
├── audit-exec.cjs        # Command audit logging (.planning/logs/)
├── git-utils.cjs         # Safe git operations (atomic commits)
├── fs-utils.cjs          # Cross-platform file utils (find/grep/head/tail replacement)
├── retry.cjs             # Exponential backoff retry logic
├── circuit-breaker.cjs   # Prevent cascading failures
├── model-provider.cjs    # Multi-model API abstraction
├── assistant-adapter.cjs # AI assistant abstraction (Claude/OpenCode/Gemini/Codex)
├── logger.cjs            # Centralized logging (ERROR/WARN/INFO/DEBUG)
├── health-check.cjs      # Environment validation
├── timeout-exec.cjs      # Command timeout with fallback
├── file-lock.cjs         # Concurrent write protection
├── temp-file.cjs         # Secure temp file handling
├── index.cjs             # Central library export
└── update.js             # ez-agents-update command
```

### Multi-Model Support

Configure different AI providers per agent:

```json
// .planning/config.json
{
  "provider": {
    "default": "alibaba",
    "anthropic": {
      "api_key": "env:ANTHROPIC_API_KEY",
      "models": { "opus": "claude-3-opus-20240229", "sonnet": "claude-3-sonnet-20240229" }
    },
    "alibaba": {
      "api_key": "env:DASHSCOPE_API_KEY",
      "models": { "high": "qwen-max", "balanced": "qwen-plus" }
    },
    "moonshot": {
      "api_key": "env:MOONSHOT_API_KEY",
      "models": { "high": "moonshot-v1-128k" }
    },
    "openai": {
      "api_key": "env:OPENAI_API_KEY",
      "models": { "high": "gpt-4-turbo-preview" }
    }
  },
  "agent_overrides": {
    "ez-planner": { "provider": "alibaba", "model": "qwen-max" },
    "ez-executor": { "provider": "anthropic", "model": "sonnet" },
    "ez-verifier": { "provider": "moonshot", "model": "balanced" }
  }
}
```

### Quick Commands

```bash
# Install EZ Agents
npm install -g ez-agents

# Setup (Claude Code)
ez-agents --claude --global

# Update
ez-agents-update

# Force update
ez-agents-update --force

# Check version
ez-agents --version

# Help
ez-agents --help
```

### Install

**Option 1: Use npx (No Installation)**

```bash
# Run installer directly without installing
npx github:howlil/ez-agents

# Or with flags
npx github:howlil/ez-agents --claude --global
```

**Option 2: Install Globally (Recommended)**

```bash
# Install from GitHub
npm install -g git+https://github.com/howlil/ez-agents.git

# Then use
ez-agents --claude --global
ez-agents-update
```

**Option 3: Install from npm (Future)**

```bash
# When published to npm
npm install -g ez-agents
```

---

I'm a solo developer. I don't write code — Claude Code does.

Other spec-driven development tools exist; BMAD, Speckit... But they all seem to make things way more complicated than they need to be (sprint ceremonies, story points, stakeholder syncs, retrospectives, Jira workflows) or lack real big picture understanding of what you're building. I'm not a 50-person software company. I don't want to play enterprise theater. I'm just a creative person trying to build great things that work.

So I built EZ Agents. The complexity is in the system, not in your workflow. Behind the scenes: context engineering, XML prompt formatting, subagent orchestration, state management. What you see: a few commands that just work.

The system gives Claude everything it needs to do the work *and* verify it. I trust the workflow. It just does a good job.

That's what this is. No enterprise roleplay bullshit. Just an incredibly effective system for building cool stuff consistently using Claude Code.

— **TÂCHES**

---

Vibecoding has a bad reputation. You describe what you want, AI generates code, and you get inconsistent garbage that falls apart at scale.

EZ Agents fixes that. It's the context engineering layer that makes Claude Code reliable. Describe your idea, let the system extract everything it needs to know, and let Claude Code get to work.

---

## Who This Is For

People who want to describe what they want and have it built correctly — without pretending they're running a 50-person engineering org.

---

## Getting Started

```bash
npx ez-agents
```

The installer prompts you to choose:
1. **Runtime** — Claude Code, OpenCode, Gemini, Codex, Copilot, or all
2. **Location** — Global (all projects) or local (current project only)

Verify with:
- Claude Code / Gemini: `/ez:help`
- OpenCode: `/ez-help`
- Codex: `$ez-help`

> [!NOTE]
> Codex installation uses skills (`skills/ez-*/SKILL.md`) rather than custom prompts.

### Staying Updated

EZ Agents evolves fast. Update periodically:

```bash
ez-agents-update
```

<details>
<summary><strong>Non-interactive Install (Docker, CI, Scripts)</strong></summary>

```bash
# Claude Code
ez-agents --claude --global   # Install to ~/.claude/
ez-agents --claude --local    # Install to ./.claude/

# OpenCode (open source, free models)
ez-agents --opencode --global # Install to ~/.config/opencode/

# Gemini CLI
ez-agents --gemini --global   # Install to ~/.gemini/

# Codex (skills-first)
ez-agents --codex --global    # Install to ~/.codex/
ez-agents --codex --local     # Install to ./.codex/

# All runtimes
ez-agents --all --global      # Install to all directories
```

Use `--global` (`-g`) or `--local` (`-l`) to skip the location prompt.
Use `--claude`, `--opencode`, `--gemini`, `--codex`, or `--all` to skip the runtime prompt.

</details>

<details>
<summary><strong>Development Installation</strong></summary>

Clone the repository and run the installer locally:

```bash
git clone https://github.com/howlil/ez-agents.git
cd ez-agents
node bin/install.js --claude --local
```

Installs to `./.claude/` for testing modifications before contributing.

</details>

### Recommended: Skip Permissions Mode

EZ Agents is designed for frictionless automation. Run Claude Code with:

```bash
claude --dangerously-skip-permissions
```

> [!TIP]
> This is how EZ Agents is intended to be used — stopping to approve `date` and `git commit` 50 times defeats the purpose.

<details>
<summary><strong>Alternative: Granular Permissions</strong></summary>

If you prefer not to use that flag, add this to your project's `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(date:*)",
      "Bash(echo:*)",
      "Bash(cat:*)",
      "Bash(ls:*)",
      "Bash(mkdir:*)",
      "Bash(wc:*)",
      "Bash(head:*)",
      "Bash(tail:*)",
      "Bash(sort:*)",
      "Bash(grep:*)",
      "Bash(tr:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(git status:*)",
      "Bash(git log:*)",
      "Bash(git diff:*)",
      "Bash(git tag:*)"
    ]
  }
}
```

</details>

---

## How It Works

> **Already have code?** Run `/ez:map-codebase` first. It spawns parallel agents to analyze your stack, architecture, conventions, and concerns. Then `/ez:new-project` knows your codebase — questions focus on what you're adding, and planning automatically loads your patterns.

### 1. Initialize Project

```
/ez:new-project
```

One command, one flow. The system:

1. **Questions** — Asks until it understands your idea completely (goals, constraints, tech preferences, edge cases)
2. **Research** — Spawns parallel agents to investigate the domain (optional but recommended)
3. **Requirements** — Extracts what's v1, v2, and out of scope
4. **Roadmap** — Creates phases mapped to requirements

You approve the roadmap. Now you're ready to build.

**Creates:** `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `.planning/research/`

---

### 2. Discuss Phase

```
/ez:discuss-phase 1
```

**This is where you shape the implementation.**

Your roadmap has a sentence or two per phase. That's not enough context to build something the way *you* imagine it. This step captures your preferences before anything gets researched or planned.

The system analyzes the phase and identifies gray areas based on what's being built:

- **Visual features** → Layout, density, interactions, empty states
- **APIs/CLIs** → Response format, flags, error handling, verbosity
- **Content systems** → Structure, tone, depth, flow
- **Organization tasks** → Grouping criteria, naming, duplicates, exceptions

For each area you select, it asks until you're satisfied. The output — `CONTEXT.md` — feeds directly into the next two steps:

1. **Researcher reads it** — Knows what patterns to investigate ("user wants card layout" → research card component libraries)
2. **Planner reads it** — Knows what decisions are locked ("infinite scroll decided" → plan includes scroll handling)

The deeper you go here, the more the system builds what you actually want. Skip it and you get reasonable defaults. Use it and you get *your* vision.

**Creates:** `{phase_num}-CONTEXT.md`

---

### 3. Plan Phase

```
/ez:plan-phase 1
```

The system:

1. **Researches** — Investigates how to implement this phase, guided by your CONTEXT.md decisions
2. **Plans** — Creates 2-3 atomic task plans with XML structure
3. **Verifies** — Checks plans against requirements, loops until they pass

Each plan is small enough to execute in a fresh context window. No degradation, no "I'll be more concise now."

**Creates:** `{phase_num}-RESEARCH.md`, `{phase_num}-{N}-PLAN.md`

---

### 4. Execute Phase

```
/ez:execute-phase 1
```

The system:

1. **Runs plans in waves** — Parallel where possible, sequential when dependent
2. **Fresh context per plan** — 200k tokens purely for implementation, zero accumulated garbage
3. **Commits per task** — Every task gets its own atomic commit
4. **Verifies against goals** — Checks the codebase delivers what the phase promised

Walk away, come back to completed work with clean git history.

**How Wave Execution Works:**

Plans are grouped into "waves" based on dependencies. Within each wave, plans run in parallel. Waves run sequentially.

```
┌────────────────────────────────────────────────────────────────────┐
│  PHASE EXECUTION                                                   │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  WAVE 1 (parallel)          WAVE 2 (parallel)          WAVE 3      │
│  ┌─────────┐ ┌─────────┐    ┌─────────┐ ┌─────────┐    ┌─────────┐ │
│  │ Plan 01 │ │ Plan 02 │ →  │ Plan 03 │ │ Plan 04 │ →  │ Plan 05 │ │
│  │         │ │         │    │         │ │         │    │         │ │
│  │ User    │ │ Product │    │ Orders  │ │ Cart    │    │ Checkout│ │
│  │ Model   │ │ Model   │    │ API     │ │ API     │    │ UI      │ │
│  └─────────┘ └─────────┘    └─────────┘ └─────────┘    └─────────┘ │
│       │           │              ↑           ↑              ↑      │
│       └───────────┴──────────────┴───────────┘              │      │
│              Dependencies: Plan 03 needs Plan 01            │      │
│                          Plan 04 needs Plan 02              │      │
│                          Plan 05 needs Plans 03 + 04        │      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Why waves matter:**
- Independent plans → Same wave → Run in parallel
- Dependent plans → Later wave → Wait for dependencies
- File conflicts → Sequential plans or same plan

This is why "vertical slices" (Plan 01: User feature end-to-end) parallelize better than "horizontal layers" (Plan 01: All models, Plan 02: All APIs).

**Creates:** `{phase_num}-{N}-SUMMARY.md`, `{phase_num}-VERIFICATION.md`

---

### 5. Verify Work

```
/ez:verify-work 1
```

**This is where you confirm it actually works.**

Automated verification checks that code exists and tests pass. But does the feature *work* the way you expected? This is your chance to use it.

The system:

1. **Extracts testable deliverables** — What you should be able to do now
2. **Walks you through one at a time** — "Can you log in with email?" Yes/no, or describe what's wrong
3. **Diagnoses failures automatically** — Spawns debug agents to find root causes
4. **Creates verified fix plans** — Ready for immediate re-execution

If everything passes, you move on. If something's broken, you don't manually debug — you just run `/ez:execute-phase` again with the fix plans it created.

**Creates:** `{phase_num}-UAT.md`, fix plans if issues found

---

### 6. Repeat → Complete → Next Milestone

```
/ez:discuss-phase 2
/ez:plan-phase 2
/ez:execute-phase 2
/ez:verify-work 2
...
/ez:complete-milestone
/ez:new-milestone
```

Loop **discuss → plan → execute → verify** until milestone complete.

If you want faster intake during discussion, use `/ez:discuss-phase <n> --batch` to answer a small grouped set of questions at once instead of one-by-one.

Each phase gets your input (discuss), proper research (plan), clean execution (execute), and human verification (verify). Context stays fresh. Quality stays high.

When all phases are done, `/ez:complete-milestone` archives the milestone and tags the release.

Then `/ez:new-milestone` starts the next version — same flow as `new-project` but for your existing codebase. You describe what you want to build next, the system researches the domain, you scope requirements, and it creates a fresh roadmap. Each milestone is a clean cycle: define → build → ship.

---

### Quick Mode

```
/ez:quick
```

**For ad-hoc tasks that don't need full planning.**

Quick mode gives you EZ Agents guarantees (atomic commits, state tracking) with a faster path:

- **Same agents** — Planner + executor, same quality
- **Skips optional steps** — No research, no plan checker, no verifier
- **Separate tracking** — Lives in `.planning/quick/`, not phases

Use for: bug fixes, small features, config changes, one-off tasks.

```
/ez:quick
> What do you want to do? "Add dark mode toggle to settings"
```

**Creates:** `.planning/quick/001-add-dark-mode-toggle/PLAN.md`, `SUMMARY.md`

---

## Why It Works

### Context Engineering

Claude Code is incredibly powerful *if* you give it the context it needs. Most people don't.

EZ Agents handles it for you:

| File | What it does |
|------|--------------|
| `PROJECT.md` | Project vision, always loaded |
| `research/` | Ecosystem knowledge (stack, features, architecture, pitfalls) |
| `REQUIREMENTS.md` | Scoped v1/v2 requirements with phase traceability |
| `ROADMAP.md` | Where you're going, what's done |
| `STATE.md` | Decisions, blockers, position — memory across sessions |
| `PLAN.md` | Atomic task with XML structure, verification steps |
| `SUMMARY.md` | What happened, what changed, committed to history |
| `todos/` | Captured ideas and tasks for later work |

Size limits based on where Claude's quality degrades. Stay under, get consistent excellence.

### XML Prompt Formatting

Every plan is structured XML optimized for Claude:

```xml
<task type="auto">
  <name>Create login endpoint</name>
  <files>src/app/api/auth/login/route.ts</files>
  <action>
    Use jose for JWT (not jsonwebtoken - CommonJS issues).
    Validate credentials against users table.
    Return httpOnly cookie on success.
  </action>
  <verify>curl -X POST localhost:3000/api/auth/login returns 200 + Set-Cookie</verify>
  <done>Valid credentials return cookie, invalid return 401</done>
</task>
```

Precise instructions. No guessing. Verification built in.

### Multi-Agent Orchestration

Every stage uses the same pattern: a thin orchestrator spawns specialized agents, collects results, and routes to the next step.

| Stage | Orchestrator does | Agents do |
|-------|------------------|-----------|
| Research | Coordinates, presents findings | 4 parallel researchers investigate stack, features, architecture, pitfalls |
| Planning | Validates, manages iteration | Planner creates plans, checker verifies, loop until pass |
| Execution | Groups into waves, tracks progress | Executors implement in parallel, each with fresh 200k context |
| Verification | Presents results, routes next | Verifier checks codebase against goals, debuggers diagnose failures |

The orchestrator never does heavy lifting. It spawns agents, waits, integrates results.

**The result:** You can run an entire phase — deep research, multiple plans created and verified, thousands of lines of code written across parallel executors, automated verification against goals — and your main context window stays at 30-40%. The work happens in fresh subagent contexts. Your session stays fast and responsive.

### Atomic Git Commits

Each task gets its own commit immediately after completion:

```bash
abc123f docs(08-02): complete user registration plan
def456g feat(08-02): add email confirmation flow
hij789k feat(08-02): implement password hashing
lmn012o feat(08-02): create registration endpoint
```

> [!NOTE]
> **Benefits:** Git bisect finds exact failing task. Each task independently revertable. Clear history for Claude in future sessions. Better observability in AI-automated workflow.

Every commit is surgical, traceable, and meaningful.

### Modular by Design

- Add phases to current milestone
- Insert urgent work between phases
- Complete milestones and start fresh
- Adjust plans without rebuilding everything

You're never locked in. The system adapts.

---

## Commands

### Core Workflow

| Command | What it does |
|---------|--------------|
| `/ez:new-project [--auto]` | Full initialization: questions → research → requirements → roadmap |
| `/ez:discuss-phase [N] [--auto]` | Capture implementation decisions before planning |
| `/ez:plan-phase [N] [--auto]` | Research + plan + verify for a phase |
| `/ez:execute-phase <N>` | Execute all plans in parallel waves, verify when complete |
| `/ez:verify-work [N]` | Manual user acceptance testing ¹ |
| `/ez:audit-milestone` | Verify milestone achieved its definition of done |
| `/ez:complete-milestone` | Archive milestone, tag release |
| `/ez:new-milestone [name]` | Start next version: questions → research → requirements → roadmap |

### Navigation

| Command | What it does |
|---------|--------------|
| `/ez:progress` | Where am I? What's next? |
| `/ez:help` | Show all commands and usage guide |
| `/ez:update` | Update EZ Agents with changelog preview |
| `/ez:join-discord` | Join the EZ Agents Discord community |

### Brownfield

| Command | What it does |
|---------|--------------|
| `/ez:map-codebase [area]` | Analyze existing codebase before new-project |

### Phase Management

| Command | What it does |
|---------|--------------|
| `/ez:add-phase` | Append phase to roadmap |
| `/ez:insert-phase [N]` | Insert urgent work between phases |
| `/ez:remove-phase [N]` | Remove future phase, renumber |
| `/ez:list-phase-assumptions [N]` | See Claude's intended approach before planning |
| `/ez:plan-milestone-gaps` | Create phases to close gaps from audit |

### Session

| Command | What it does |
|---------|--------------|
| `/ez:pause-work` | Create handoff when stopping mid-phase |
| `/ez:resume-work` | Restore from last session |

### Utilities

| Command | What it does |
|---------|--------------|
| `/ez:settings` | Configure model profile and workflow agents |
| `/ez:set-profile <profile>` | Switch model profile (quality/balanced/budget) |
| `/ez:add-todo [desc]` | Capture idea for later |
| `/ez:check-todos` | List pending todos |
| `/ez:debug [desc]` | Systematic debugging with persistent state |
| `/ez:quick [--full] [--discuss]` | Execute ad-hoc task with EZ Agents guarantees (`--full` adds plan-checking and verification, `--discuss` gathers context first) |
| `/ez:health [--repair]` | Validate `.planning/` directory integrity, auto-repair with `--repair` |

<sup>¹ Contributed by reddit user OracleGreyBeard</sup>

---

## Configuration

EZ Agents stores project settings in `.planning/config.json`. Configure during `/ez:new-project` or update later with `/ez:settings`. For the full config schema, workflow toggles, git branching options, and per-agent model breakdown, see the [User Guide](docs/USER-GUIDE.md#configuration-reference).

### Core Settings

| Setting | Options | Default | What it controls |
|---------|---------|---------|------------------|
| `mode` | `yolo`, `interactive` | `interactive` | Auto-approve vs confirm at each step |
| `granularity` | `coarse`, `standard`, `fine` | `standard` | Phase granularity — how finely scope is sliced (phases × plans) |

### Model Profiles

Control which Claude model each agent uses. Balance quality vs token spend.

| Profile | Planning | Execution | Verification |
|---------|----------|-----------|--------------|
| `quality` | Opus | Opus | Sonnet |
| `balanced` (default) | Opus | Sonnet | Sonnet |
| `budget` | Sonnet | Sonnet | Haiku |

Switch profiles:
```
/ez:set-profile budget
```

Or configure via `/ez:settings`.

### Workflow Agents

These spawn additional agents during planning/execution. They improve quality but add tokens and time.

| Setting | Default | What it does |
|---------|---------|--------------|
| `workflow.research` | `true` | Researches domain before planning each phase |
| `workflow.plan_check` | `true` | Verifies plans achieve phase goals before execution |
| `workflow.verifier` | `true` | Confirms must-haves were delivered after execution |
| `workflow.auto_advance` | `false` | Auto-chain discuss → plan → execute without stopping |

Use `/ez:settings` to toggle these, or override per-invocation:
- `/ez:plan-phase --skip-research`
- `/ez:plan-phase --skip-verify`

### Execution

| Setting | Default | What it controls |
|---------|---------|------------------|
| `parallelization.enabled` | `true` | Run independent plans simultaneously |
| `planning.commit_docs` | `true` | Track `.planning/` in git |

### Git Branching

Control how EZ Agents handles branches during execution.

| Setting | Options | Default | What it does |
|---------|---------|---------|--------------|
| `git.branching_strategy` | `none`, `phase`, `milestone` | `none` | Branch creation strategy |
| `git.phase_branch_template` | string | `ez/phase-{phase}-{slug}` | Template for phase branches |
| `git.milestone_branch_template` | string | `ez/{milestone}-{slug}` | Template for milestone branches |

**Strategies:**
- **`none`** — Commits to current branch (default EZ Agents behavior)
- **`phase`** — Creates a branch per phase, merges at phase completion
- **`milestone`** — Creates one branch for entire milestone, merges at completion

At milestone completion, EZ Agents offers squash merge (recommended) or merge with history.

---

## Security

### Protecting Sensitive Files

EZ Agents' codebase mapping and analysis commands read files to understand your project. **Protect files containing secrets** by adding them to Claude Code's deny list:

1. Open Claude Code settings (`.claude/settings.json` or global)
2. Add sensitive file patterns to the deny list:

```json
{
  "permissions": {
    "deny": [
      "Read(.env)",
      "Read(.env.*)",
      "Read(**/secrets/*)",
      "Read(**/*credential*)",
      "Read(**/*.pem)",
      "Read(**/*.key)"
    ]
  }
}
```

This prevents Claude from reading these files entirely, regardless of what commands you run.

> [!IMPORTANT]
> EZ Agents includes built-in protections against committing secrets, but defense-in-depth is best practice. Deny read access to sensitive files as a first line of defense.

---

## Troubleshooting

**Commands not found after install?**
- Restart your runtime to reload commands/skills
- Verify files exist in `~/.claude/commands/ez/` (global) or `./.claude/commands/ez/` (local)
- For Codex, verify skills exist in `~/.codex/skills/ez-*/SKILL.md` (global) or `./.codex/skills/ez-*/SKILL.md` (local)

**Commands not working as expected?**
- Run `/ez:help` to verify installation
- Re-run `ez-agents` to reinstall

**Updating to the latest version?**
```bash
ez-agents-update
```

**Using Docker or containerized environments?**

If file reads fail with tilde paths (`~/.claude/...`), set `CLAUDE_CONFIG_DIR` before installing:
```bash
CLAUDE_CONFIG_DIR=/home/youruser/.claude ez-agents --global
```
This ensures absolute paths are used instead of `~` which may not expand correctly in containers.

### Uninstalling

To remove EZ Agents completely:

```bash
# Global installs
ez-agents --claude --global --uninstall
ez-agents --opencode --global --uninstall
ez-agents --codex --global --uninstall

# Local installs (current project)
ez-agents --claude --local --uninstall
ez-agents --opencode --local --uninstall
ez-agents --codex --local --uninstall
```

This removes all EZ Agents commands, agents, hooks, and settings while preserving your other configurations.

---

## Community Ports

OpenCode, Gemini CLI, and Codex are now natively supported via `ez-agents`.

These community ports pioneered multi-runtime support:

| Project | Platform | Description |
|---------|----------|-------------|
| [gsd-opencode](https://github.com/rokicool/gsd-opencode) | OpenCode | Original OpenCode adaptation |
| gsd-gemini (archived) | Gemini CLI | Original Gemini adaptation by uberfuzzy |

---

## Star History

<a href="https://star-history.com/#glittercowboy/get-shit-done&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=glittercowboy/get-shit-done&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=glittercowboy/get-shit-done&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=glittercowboy/get-shit-done&type=Date" />
 </picture>
</a>

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Claude Code is powerful. EZ Agents makes it reliable.**

</div>
