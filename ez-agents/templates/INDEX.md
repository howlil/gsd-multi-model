# EZ Agents Templates Index

**Version:** 1.0.0  
**Last Updated:** 2026-03-29  
**Purpose:** Navigate all EZ Agents output templates

---

## 📋 Core Planning Templates

| Template | Purpose | Used By |
|----------|---------|---------|
| [[project.md]](./project.md) | Project charter and overview | `/ez:new-project` |
| [[requirements.md]](./requirements.md) | Functional and non-functional requirements | All planning workflows |
| [[roadmap.md]](./roadmap.md) | Strategic roadmap with phases | `/ez:new-project`, `/ez:new-milestone` |
| [[state.md]](./state.md) | Current project state tracking | All workflows |
| [[discussion.md]](./discussion.md) | Phase discussion notes | `/ez:discuss-phase` |
| [[context.md]](./context.md) | Phase context and decisions | `/ez:discuss-phase` |

---

## 🤖 Agent Output Templates

| Template | Purpose | Audience |
|----------|---------|----------|
| [[summary.md]](./summary.md) | Standard phase summary format | ez-executor |
| [[summary-minimal.md]](./summary-minimal.md) | Minimal summary for quick tasks | ez-executor (budget mode) |
| [[summary-standard.md]](./summary-standard.md) | Standard detail level summary | ez-executor (balanced mode) |
| [[summary-complex.md]](./summary-complex.md) | Comprehensive summary with analysis | ez-executor (quality mode) |
| [[phase-prompt.md]](./phase-prompt.md) | Phase execution prompt template | ez-executor |
| [[planner-subagent-prompt.md]](./planner-subagent-prompt.md) | Planner agent prompt | ez-planner |
| [[debug-subagent-prompt.md]](./debug-subagent-prompt.md) | Debug agent prompt | ez-debugger |

### Output Standards

| Template | Purpose |
|----------|---------|
| [[agent-output-format.md]](./agent-output-format.md) | Required 5 sections for all agent output |
| [[handoff-protocol.md]](./handoff-protocol.md) | Agent-to-agent context transfer protocol |

---

## 📊 Milestone & Release Templates

| Template | Purpose | Used By |
|----------|---------|---------|
| [[milestone.md]](./milestone.md) | Milestone definition | `/ez:new-milestone` |
| [[milestone-archive.md]](./milestone-archive.md) | Milestone completion archive | `/ez:complete-milestone` |
| [[release-checklist.md]](./release-checklist.md) | Production release checklist | `/ez:release` |
| [[rollback-plan.md]](./rollback-plan.md) | Rollback procedure template | `/ez:hotfix` |
| [[incident-runbook.md]](./incident-runbook.md) | Incident response template | `/ez:hotfix` |
| [[retrospective.md]](./retrospective.md) | Milestone retrospective | Post-milestone |

---

## 🔍 Research & Discovery Templates

| Template | Purpose | Used By |
|----------|---------|---------|
| [[research.md]](./research.md) | Research findings summary | All research workflows |
| [[discovery.md]](./discovery.md) | Product discovery output | `/ez:product-discovery` |
| [[DEBUG.md]](./DEBUG.md) | Debug session documentation | ez-debugger |
| [[continue-here.md]](./continue-here.md) | Session continuation marker | All workflows |

### Research Project Templates

| Template | Purpose |
|----------|---------|
| [[research-project/ARCHITECTURE.md]](./research-project/ARCHITECTURE.md) | Architecture research findings |
| [[research-project/FEATURES.md]](./research-project/FEATURES.md) | Feature research findings |
| [[research-project/PITFALLS.md]](./research-project/PITFALLS.md) | Common pitfalls and anti-patterns |
| [[research-project/STACK.md]](./research-project/STACK.md) | Technology stack research |
| [[research-project/SUMMARY.md]](./research-project/SUMMARY.md) | Research summary |

---

## 🏗️ Codebase Documentation Templates

| Template | Purpose | Used By |
|----------|---------|---------|
| [[codebase/architecture.md]](./codebase/architecture.md) | System architecture overview | `/ez:map-codebase` |
| [[codebase/concerns.md]](./codebase/concerns.md) | Cross-cutting concerns | `/ez:map-codebase` |
| [[codebase/conventions.md]](./codebase/conventions.md) | Coding conventions | `/ez:map-codebase` |
| [[codebase/integrations.md]](./codebase/integrations.md) | External integrations | `/ez:map-codebase` |
| [[codebase/stack.md]](./codebase/stack.md) | Technology stack | `/ez:map-codebase` |
| [[codebase/structure.md]](./codebase/structure.md) | Project structure | `/ez:map-codebase` |
| [[codebase/testing.md]](./codebase/testing.md) | Testing strategy | `/ez:map-codebase` |

---

## ⚙️ Configuration Templates

| Template | Purpose | Used By |
|----------|---------|---------|
| [[user-setup.md]](./user-setup.md) | User environment setup | Project initialization |
| [[security-user-setup.md]](./security-user-setup.md) | Security-focused setup | Security workflows |
| [[copilot-instructions.md]](./copilot-instructions.md) | GitHub Copilot instructions | Copilot integration |
| [[config.json]](./config.json) | Template configuration | Internal |
| [[mode-workflow-templates.md]](./mode-workflow-templates.md) | Operation mode templates | Workflow configuration |
| [[skill-validation-rules.md]](./skill-validation-rules.md) | Skill validation schema | Skill system |

---

## 🧪 Testing Templates

| Template | Purpose | Used By |
|----------|---------|---------|
| [[UAT.md]](./UAT.md) | User acceptance testing | `/ez:verify-work` |
| [[bdd-feature.md]](./bdd-feature.md) | BDD feature specifications | TDD workflows |

---

## 📝 Template Usage Guide

### When to Use Each Template

#### Project Initialization
1. `project.md` — Project charter
2. `requirements.md` — Requirements specification
3. `roadmap.md` — Strategic roadmap
4. `state.md` — State tracking

#### Phase Planning
1. `discussion.md` — Capture decisions
2. `context.md` — Phase context
3. `phase-prompt.md` — Execution prompt

#### Phase Execution
1. `summary.md` (or variant) — Phase summary
2. `continue-here.md` — Session markers
3. `DEBUG.md` — Debug sessions

#### Milestone Management
1. `milestone.md` — Milestone definition
2. `milestone-archive.md` — Archive completed
3. `retrospective.md` — Lessons learned

#### Production
1. `release-checklist.md` — Release prep
2. `rollback-plan.md` — Contingency
3. `incident-runbook.md` — Incident response

---

## 🔧 Template Variables

Templates support the following variables:

- `{project_name}` — Project name
- `{version}` — Version number
- `{phase_number}` — Phase identifier (e.g., "01", "12A.1.2")
- `{phase_name}` — Phase name slug
- `{milestone_version}` — Milestone version (e.g., "v1.0")
- `{timestamp}` — ISO 8601 timestamp
- `{agent_name}` — Agent identifier
- `{model_profile}` — Model tier (quality/balanced/budget)

---

## 📐 Template Schema

All templates follow this structure:

```markdown
# {Title}

**Metadata:** Key-value pairs

## Overview

Purpose and scope.

## Template Content

Structured sections with {variables}.

## Usage Notes

When and how to use.
```

---

## 🔄 Template Versioning

Templates are versioned with the EZ Agents system:

- **v1.0.x** — Initial template set
- **v1.1.x** — Summary variants added
- **v1.2.x** — Codebase templates added
- **v2.0.0** — XML tag format migration

Check template frontmatter for version info.

---

## See Also

- [[../references/INDEX.md]](../references/INDEX.md) — Reference documentation index
- [[../workflows/INDEX.md]](../workflows/INDEX.md) — Workflow index
- [[../agents/PRINCIPLES.md]](../agents/PRINCIPLES.md) — Agent principles
- [[agent-output-format.md]](./agent-output-format.md) — Output format requirements

---

**Maintained by:** EZ Agents Core Team  
**Feedback:** Open an issue on GitHub
