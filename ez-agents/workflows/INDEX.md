# EZ Agents Workflows Index

**Version:** 1.0.0  
**Last Updated:** 2026-03-29  
**Purpose:** Navigate all EZ Agents workflows and commands

---

## 🚀 Quick Start

| Workflow | Command | Time | Purpose |
|----------|---------|------|---------|
| [[new-project.md]](./new-project.md) | `/ez:new-project` | 30-60 min | Start greenfield project |
| [[quick.md]](./quick.md) | `/ez:quick` | 5-15 min | Execute ad-hoc tasks |
| [[help.md]](./help.md) | `/ez:help` | — | Display full reference |

---

## 📋 Initialization Workflows

### Greenfield Projects

| Workflow | Command | Purpose | Artifacts |
|----------|---------|---------|-----------|
| [[new-project.md]](./new-project.md) | `/ez:new-project` | Initialize new project | `.planning/PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md` |
| [[product-discovery.md]](./product-discovery.md) | `/ez:product-discovery` | Validate problem, define metrics | `RESEARCH.md`, metrics schema |
| [[map-codebase.md]](./map-codebase.md) | `/ez:map-codebase` | Map existing codebase | `.planning/codebase/` docs |

### Milestone Cycles

| Workflow | Command | Purpose | Artifacts |
|----------|---------|---------|-----------|
| [[new-milestone.md]](./new-milestone.md) | `/ez:new-milestone` | Start milestone cycle | Updated `ROADMAP.md`, milestone phases |
| [[audit-milestone.md]](./audit-milestone.md) | `/ez:audit-milestone` | Verify milestone DoD | Audit report |
| [[complete-milestone.md]](./complete-milestone.md) | `/ez:complete-milestone` | Archive milestone | `milestone-archive.md`, archived phases |
| [[cleanup.md]](./cleanup.md) | — | Archive phase directories | Cleaned `.planning/phases/` |
| [[plan-milestone-gaps.md]](./plan-milestone-gaps.md) | — | Create gap closure phases | Additional phases in ROADMAP |

---

## 🔄 Phase Lifecycle Workflows

### Planning Phase

| Workflow | Command | Purpose | Time |
|----------|---------|---------|------|
| [[discuss-phase.md]](./discuss-phase.md) | `/ez:discuss-phase [N]` | Capture implementation decisions | 15-30 min |
| [[plan-phase.md]](./plan-phase.md) | `/ez:plan-phase [N]` | Create executable phase plan | 30-60 min |

### Execution Phase

| Workflow | Command | Purpose | Time |
|----------|---------|---------|------|
| [[execute-phase.md]](./execute-phase.md) | `/ez:execute-phase [N]` | Execute all plans in phase | 1-2 hours |
| [[execute-plan.md]](./execute-plan.md) | — | Execute single plan | 15-30 min |
| [[run-phase.md]](./run-phase.md) | `/ez:run-phase [N]` | Run phase with full automation | 1-2 hours |

### Verification Phase

| Workflow | Command | Purpose | Time |
|----------|---------|---------|------|
| [[verify-work.md]](./verify-work.md) | `/ez:verify-work [--all]` | Run quality gates | 30-60 min |
| [[transition.md]](./transition.md) | — | Mark phase complete, advance | 10-15 min |

---

## 🔧 Utility Workflows

### Project Management

| Workflow | Command | Purpose |
|----------|---------|---------|
| [[progress.md]](./progress.md) | `/ez:progress` | Check project status |
| [[resume-project.md]](./resume-project.md) | `/ez:resume-work` | Restore session context |
| [[pause-work.md]](./pause-work.md) | — | Create handoff file |
| [[add-todo.md]](./add-todo.md) | — | Capture ideas for later |
| [[check-todos.md]](./check-todos.md) | — | Review pending todos |

### Phase Management

| Workflow | Command | Purpose |
|----------|---------|---------|
| [[add-phase.md]](./add-phase.md) | — | Add phase to roadmap |
| [[insert-phase.md]](./insert-phase.md) | — | Insert phase between existing |
| [[remove-phase.md]](./remove-phase.md) | — | Remove phase from roadmap |

### Testing & Quality

| Workflow | Command | Purpose |
|----------|---------|---------|
| [[add-tests.md]](./add-tests.md) | — | Add tests to existing code |
| [[diagnose-issues.md]](./diagnose-issues.md) | — | Diagnose build/test failures |

### Release & Maintenance

| Workflow | Command | Purpose |
|----------|---------|---------|
| [[release.md]](./release.md) | — | Prepare production release |
| [[hotfix.md]](./hotfix.md) | — | Execute emergency hotfix |
| [[update.md]](./update.md) | `/ez:update` | Update EZ Agents system |

### Configuration

| Workflow | Command | Purpose |
|----------|---------|---------|
| [[settings.md]](./settings.md) | `/ez:settings` | Configure workflow options |
| [[help.md]](./help.md) | `/ez:help` | Display command reference |

---

## ⚡ Quick Mode Workflows

| Workflow | Command | Purpose | Flags |
|----------|---------|---------|-------|
| [[quick.md]](./quick.md) | `/ez:quick "task"` | Execute ad-hoc tasks | `--discuss`, `--full` |
| [[autonomous.md]](./autonomous.md) | — | Run autonomous mode | — |

### Quick Mode Flags

- `--discuss` — Lightweight discussion before planning
- `--full` — Enable plan-checking + verification
- `--discuss --full` — Full quality guarantees

---

## 📊 Workflow Categories

### By Complexity

**High Complexity (1-2 hours):**
- [[new-project.md]](./new-project.md)
- [[execute-phase.md]](./execute-phase.md)
- [[run-phase.md]](./run-phase.md)
- [[product-discovery.md]](./product-discovery.md)

**Medium Complexity (30-60 min):**
- [[new-milestone.md]](./new-milestone.md)
- [[plan-phase.md]](./plan-phase.md)
- [[discuss-phase.md]](./discuss-phase.md)
- [[verify-work.md]](./verify-work.md)
- [[map-codebase.md]](./map-codebase.md)

**Low Complexity (5-15 min):**
- [[quick.md]](./quick.md)
- [[progress.md]](./progress.md)
- [[transition.md]](./transition.md)
- [[add-todo.md]](./add-todo.md)
- [[check-todos.md]](./check-todos.md)

---

## 🔄 Workflow Dependencies

```
new-project
    └─> product-discovery (optional)
    └─> map-codebase (for existing projects)
    └─> new-milestone
        └─> discuss-phase
        └─> plan-phase
        └─> execute-phase
            └─> execute-plan (multiple)
            └─> verify-work
            └─> transition
        └─> audit-milestone
        └─> complete-milestone
            └─> cleanup
```

---

## 🎯 Workflow Selection Guide

### Starting a New Project?

1. **Greenfield:** `/ez:new-project`
2. **Existing codebase:** `/ez:map-codebase` then `/ez:new-milestone`
3. **Uncertain requirements:** `/ez:product-discovery` first

### Planning a Phase?

1. **Need clarity:** `/ez:discuss-phase [N]`
2. **Ready to plan:** `/ez:plan-phase [N]`
3. **Want discussion + plan:** `/ez:discuss-phase [N]` then `/ez:plan-phase [N]`

### Executing Work?

1. **Standard execution:** `/ez:execute-phase [N]`
2. **Quick task:** `/ez:quick "task description"`
3. **Full automation:** `/ez:run-phase [N]`

### Verifying Work?

1. **After phase:** `/ez:verify-work`
2. **Before milestone complete:** `/ez:audit-milestone`
3. **Add tests:** `/ez:add-tests`

### Managing Milestones?

1. **Start:** `/ez:new-milestone`
2. **Check progress:** `/ez:progress`
3. **Complete:** `/ez:complete-milestone`
4. **Archive:** Automatic in complete-milestone

---

## 📋 Workflow Arguments

### Phase Number Format

All phase workflows accept phase numbers in these formats:

- **Integer:** `1`, `2`, `12`
- **Padded:** `01`, `02`, `12`
- **With letter:** `12A`, `12B`
- **Decimal:** `12.1`, `12.1.2`
- **Combined:** `12A.1.2`

### Common Flags

| Flag | Purpose | Workflows |
|------|---------|-----------|
| `--auto` | Skip checkpoints | All phase workflows |
| `--gaps` | Plan missing work | `plan-milestone-gaps` |
| `--brief` | Minimal output | `progress`, `verify-work` |
| `--full` | Enable verification | `quick`, `verify-work` |
| `--discuss` | Discussion phase | `quick` |

---

## 🔍 Workflow Internals

### Workflow Structure

```markdown
<objective>
Purpose and goal.
</objective>

<execution_context>
@~/.claude/ez-agents/workflows/...
@~/.claude/ez-agents/templates/...
@~/.claude/ez-agents/references/...
</execution_context>

<process>
1. Step-by-step instructions
2. With success criteria
</process>

<files_to_read>
Optional file list.
</files_to_read>

<files_to_edit>
Optional edit list.
</files_to_edit>
```

### Workflow Variables

- `$ARGUMENTS` — Command arguments
- `$PHASE` — Normalized phase number
- `$PHASE_DIR` — Phase directory path
- `$MILESTONE` — Current milestone version

---

## 📊 Workflow Metrics

Track workflow performance:

```bash
node ez-tools.cjs stats --workflow execute-phase
```

**Metrics tracked:**
- Duration (avg, min, max)
- Token consumption
- Checkpoints hit rate
- Success rate
- Deviations

---

## 🧪 Testing Workflows

Workflow integration tests:

```bash
npm test -- tests/workflows/
```

**Test coverage:**
- `new-project.test.ts` — Project initialization
- `plan-phase.test.ts` — Phase planning
- `execute-phase.test.ts` — Phase execution
- `quick.test.ts` — Quick mode

---

## 🔄 Workflow Versioning

Workflows use semantic versioning:

```markdown
---
workflow: execute-phase
version: 2.1.0
last_updated: 2026-03-29
breaking_changes: []
changelog:
  - 2.1.0: Added auto-advance support
  - 2.0.0: Migrated to XML tag format
---
```

Check workflow frontmatter for version info.

---

## See Also

- [[../references/INDEX.md]](../references/INDEX.md) — Reference documentation
- [[../templates/INDEX.md]](../templates/INDEX.md) — Template index
- [[../agents/PRINCIPLES.md]](../agents/PRINCIPLES.md) — Agent principles
- [[../references/checkpoints.md]](../references/checkpoints.md) — Checkpoint protocol
- [[../references/environment-variables.md]](../references/environment-variables.md) — Configuration

---

**Maintained by:** EZ Agents Core Team  
**Feedback:** Open an issue on GitHub
