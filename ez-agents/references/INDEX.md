# EZ Agents Reference Index

**Version:** 1.0.0  
**Last Updated:** 2026-03-29  
**Purpose:** Navigate all EZ Agents documentation, templates, and workflows

---

## 🚀 Getting Started

| Document | Purpose | Audience |
|----------|---------|----------|
| [[questioning.md]](./questioning.md) | How to discover project requirements | All users |
| [[tier-strategy.md]](./tier-strategy.md) | Choose your release strategy (MVP/Medium/Enterprise) | All users |
| [[new-project.md]](../workflows/new-project.md) | Initialize your first project | New users |
| [[new-milestone.md]](../workflows/new-milestone.md) | Start new milestone cycle | Existing users |

---

## 🤖 For AI Agents

### Agent Specifications

| Agent | Purpose | Model Profile |
|-------|---------|---------------|
| [[ez-planner.md]](../agents/ez-planner.md) | Creates executable phase plans | Opus/Sonnet |
| [[ez-executor.md]](../agents/ez-executor.md) | Executes plans with atomic commits | Opus/Sonnet |
| [[ez-verifier.md]](../agents/ez-verifier.md) | Verifies goal achievement | Sonnet |
| [[ez-roadmapper.md]](../agents/ez-roadmapper.md) | Creates strategic roadmaps | Opus/Sonnet |
| [[ez-phase-researcher.md]](../agents/ez-phase-researcher.md) | Researches phase requirements | Opus/Sonnet |
| [[ez-project-researcher.md]](../agents/ez-project-researcher.md) | Discovers project context | Opus/Sonnet |
| [[ez-debugger.md]](../agents/ez-debugger.md) | Diagnoses issues | Opus/Sonnet |
| [[ez-codebase-mapper.md]](../agents/ez-codebase-mapper.md) | Maps existing codebases | Sonnet/Haiku |
| [[ez-release-agent.md]](../agents/ez-release-agent.md) | Manages production releases | Opus/Sonnet |

### Core Philosophy

- [[PRINCIPLES.md]](../agents/PRINCIPLES.md) — Core philosophy shared by all 21 EZ Agents
  - Solo Developer + Claude Workflow
  - Plans Are Prompts
  - Quality Degradation Curve
  - Clean Code Principles (YAGNI, KISS, SOLID, DRY)
  - Testing Principles (FIRST, Test Pyramid, AAA)

### Output Standards

- [[agent-output-format.md]](../templates/agent-output-format.md) — Required output structure for all agents
- [[handoff-protocol.md]](../templates/handoff-protocol.md) — Agent-to-agent context transfer

---

## 🔧 For Workflow Authors

### Core Workflows

| Workflow | Purpose | Time |
|----------|---------|------|
| [[discuss-phase.md]](../workflows/discuss-phase.md) | Capture implementation decisions | 15-30 min |
| [[plan-phase.md]](../workflows/plan-phase.md) | Create executable phase plans | 30-60 min |
| [[execute-phase.md]](../workflows/execute-phase.md) | Execute all plans in phase | 1-2 hours |
| [[verify-work.md]](../workflows/verify-work.md) | Run quality gates | 30-60 min |
| [[transition.md]](../workflows/transition.md) | Mark phase complete, advance | 10-15 min |

### Interaction Patterns

- [[checkpoints.md]](./checkpoints.md) — Human-AI interaction protocol
  - checkpoint:human-verify (90%)
  - checkpoint:decision (9%)
  - checkpoint:human-action (1%)
  - Auto-mode bypass behavior

### Quality Assurance

- [[verification-patterns.md]](./verification-patterns.md) — Detect stub implementations
  - React component stubs
  - API route stubs
  - Wiring red flags
- [[tdd.md]](./tdd.md) — Test-driven development protocol
  - RED → GREEN → REFACTOR
  - TDD detection heuristics
  - Test pyramid

### Git Integration

- [[git-integration.md]](./git-integration.md) — Git commit strategy
  - Per-task commits
  - Conventional commits format
  - Branch strategy

---

## 📋 Configuration

| Document | Purpose |
|----------|---------|
| [[planning-config.md]](./planning-config.md) | All configuration options |
| [[model-profiles.md]](./model-profiles.md) | Model tier definitions |
| [[model-profile-resolution.md]](./model-profile-resolution.md) | Model selection logic |
| [[metrics-schema.md]](./metrics-schema.md) | Success metrics definition |

---

## 📊 Project Management

| Document | Purpose |
|----------|---------|
| [[phase-argument-parsing.md]](./phase-argument-parsing.md) | Phase number normalization |
| [[decimal-phase-calculation.md]](./decimal-phase-calculation.md) | Urgent phase insertion |
| [[continuation-format.md]](./continuation-format.md) | Session persistence format |
| [[ui-brand.md]](./ui-brand.md) | Visual output patterns |
| [[questioning.md]](./questioning.md) | Project discovery methodology |

---

## 📚 Templates

| Template | Purpose |
|----------|---------|
| [[agent-output-format.md]](../templates/agent-output-format.md) | Standardized agent output format |
| [[handoff-protocol.md]](../templates/handoff-protocol.md) | Agent handoff protocol |
| [[summary.md]](../templates/summary.md) | Phase plan summary template |
| [[phase-prompt.md]](../templates/phase-prompt.md) | Phase execution prompt |
| [[planner-subagent-prompt.md]](../templates/planner-subagent-prompt.md) | Planner agent prompt |
| [[debug-subagent-prompt.md]](../templates/debug-subagent-prompt.md) | Debug agent prompt |
| [[mode-workflow-templates.md]](../templates/mode-workflow-templates.md) | Operation mode templates |
| [[skill-validation-rules.md]](../templates/skill-validation-rules.md) | Skill validation rules |

---

## 🗺️ Workflows

### Initialization

| Workflow | Command | Purpose |
|----------|---------|---------|
| [[new-project.md]](../workflows/new-project.md) | `/ez:new-project` | Initialize greenfield project |
| [[new-milestone.md]](../workflows/new-milestone.md) | `/ez:new-milestone` | Start new milestone cycle |
| [[map-codebase.md]](../workflows/map-codebase.md) | `/ez:map-codebase` | Map existing codebase |
| [[product-discovery.md]](../workflows/product-discovery.md) | `/ez:product-discovery` | Validate problem, define metrics |

### Phase Lifecycle

| Workflow | Command | Purpose |
|----------|---------|---------|
| [[discuss-phase.md]](../workflows/discuss-phase.md) | `/ez:discuss-phase` | Gather phase context |
| [[plan-phase.md]](../workflows/plan-phase.md) | `/ez:plan-phase` | Create phase plan |
| [[execute-phase.md]](../workflows/execute-phase.md) | `/ez:execute-phase` | Execute all plans |
| [[execute-plan.md]](../workflows/execute-plan.md) | — | Execute single plan |
| [[verify-work.md]](../workflows/verify-work.md) | `/ez:verify-work` | Run quality gates |
| [[transition.md]](../workflows/transition.md) | — | Mark phase complete |

### Milestone Management

| Workflow | Command | Purpose |
|----------|---------|---------|
| [[audit-milestone.md]](../workflows/audit-milestone.md) | `/ez:audit-milestone` | Verify milestone DoD |
| [[complete-milestone.md]](../workflows/complete-milestone.md) | `/ez:complete-milestone` | Archive milestone |
| [[cleanup.md]](../workflows/cleanup.md) | — | Archive phase directories |
| [[plan-milestone-gaps.md]](../workflows/plan-milestone-gaps.md) | — | Create gap closure phases |

### Utilities

| Workflow | Command | Purpose |
|----------|---------|---------|
| [[quick.md]](../workflows/quick.md) | `/ez:quick` | Execute ad-hoc tasks |
| [[progress.md]](../workflows/progress.md) | `/ez:progress` | Check project status |
| [[resume-project.md]](../workflows/resume-project.md) | `/ez:resume-work` | Restore session context |
| [[pause-work.md]](../workflows/pause-work.md) | — | Create handoff file |
| [[add-todo.md]](../workflows/add-todo.md) | — | Capture ideas |
| [[check-todos.md]](../workflows/check-todos.md) | — | Review todos |
| [[settings.md]](../workflows/settings.md) | `/ez:settings` | Configure workflow |
| [[help.md]](../workflows/help.md) | `/ez:help` | Display reference |
| [[update.md]](../workflows/update.md) | `/ez:update` | Update EZ Agents |

---

## 🔍 Quick Reference

### Common Commands

```bash
# Start new project
/ez:new-project

# Plan and execute phase
/ez:discuss-phase 1
/ez:plan-phase 1
/ez:execute-phase 1

# Verify work
/ez:verify-work --all

# Check progress
/ez:progress
```

### Model Profiles

| Profile | Researcher | Planner | Executor | Verifier |
|---------|-----------|---------|----------|----------|
| Quality | Opus | Opus | Opus | Sonnet |
| Balanced | Sonnet | Opus | Sonnet | Sonnet |
| Budget | Haiku | Sonnet | Haiku | Haiku |

### Context Budget

| Usage | Quality | Action |
|-------|---------|--------|
| 0-30% | PEAK | Thorough, comprehensive |
| 30-50% | GOOD | Confident, solid work |
| 50-70% | DECLINING | Repetitive, unfocused |
| 70%+ | POOR | Confused, contradictory |

**Rule:** Keep prompts under 50% context window for peak quality.

---

## 📖 Index

### By Topic

**Authentication:** [[tdd.md]](./tdd.md), [[verification-patterns.md]](./verification-patterns.md)  
**Checkpoints:** [[checkpoints.md]](./checkpoints.md)  
**Configuration:** [[planning-config.md]](./planning-config.md), [[settings.md]](../workflows/settings.md)  
**Git:** [[git-integration.md]](./git-integration.md)  
**Metrics:** [[metrics-schema.md]](./metrics-schema.md)  
**Models:** [[model-profiles.md]](./model-profiles.md), [[model-profile-resolution.md]](./model-profile-resolution.md)  
**Planning:** [[planning-config.md]](./planning-config.md), [[tier-strategy.md]](./tier-strategy.md)  
**Quality:** [[verification-patterns.md]](./verification-patterns.md), [[tdd.md]](./tdd.md)  
**Testing:** [[tdd.md]](./tdd.md), [[add-tests.md]](../workflows/add-tests.md)  
**Verification:** [[verification-patterns.md]](./verification-patterns.md)

---

**Maintained by:** EZ Agents Core Team  
**Feedback:** Open an issue on GitHub
