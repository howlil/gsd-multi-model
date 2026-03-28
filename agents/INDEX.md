# EZ Agents Agent Index

**Version:** 1.0.0  
**Last Updated:** 2026-03-29  
**Purpose:** Navigate all EZ Agents and their specifications

---

## 🤖 Agent Roster

### Core Agents

| Agent | Purpose | Model Profile | Tools |
|-------|---------|---------------|-------|
| [[ez-planner.md]](./ez-planner.md) | Create executable phase plans | Opus/Sonnet | Read, Write, Bash |
| [[ez-executor.md]](./ez-executor.md) | Execute plans with atomic commits | Opus/Sonnet | Read, Write, Bash, Edit |
| [[ez-verifier.md]](./ez-verifier.md) | Verify goal achievement | Sonnet | Read, Bash |
| [[ez-roadmapper.md]](./ez-roadmapper.md) | Create strategic roadmaps | Opus/Sonnet | Read, Write |

### Research Agents

| Agent | Purpose | Model Profile | Tools |
|-------|---------|---------------|-------|
| [[ez-phase-researcher.md]](./ez-phase-researcher.md) | Research phase requirements | Opus/Sonnet | Read, Grep, Glob |
| [[ez-project-researcher.md]](./ez-project-researcher.md) | Discover project context | Opus/Sonnet | Read, Grep, Glob |
| [[ez-codebase-mapper.md]](./ez-codebase-mapper.md) | Map existing codebases | Sonnet/Haiku | Read, Grep, Glob |

### Specialized Agents

| Agent | Purpose | Model Profile | Tools |
|-------|---------|---------------|-------|
| [[ez-debugger.md]](./ez-debugger.md) | Diagnose build/test failures | Opus/Sonnet | Read, Bash, Write |
| [[ez-release-agent.md]](./ez-release-agent.md) | Manage production releases | Opus/Sonnet | Read, Write, Bash |

---

## 📚 Shared Philosophy

All EZ Agents follow the core principles in:

- [[PRINCIPLES.md]](./PRINCIPLES.md) — Core philosophy shared by all 21 EZ Agents

### Key Principles

1. **Solo Developer + Claude Workflow**
   - Planning for ONE person (the user) and ONE implementer (Claude)
   - No teams, stakeholders, ceremonies
   - User = visionary/product owner, Claude = builder

2. **Plans Are Prompts**
   - PLAN.md IS the prompt (not a document that becomes one)
   - Contains: Objective, Context, Tasks, Success criteria
   - Not a specification with appendices and version history

3. **Quality Degradation Curve**
   - 0-30% context: PEAK quality
   - 30-50% context: GOOD quality
   - 50-70% context: DECLINING
   - 70%+ context: POOR
   - **Rule:** Keep prompts under 50% context window

4. **Clean Code Principles**
   - YAGNI (You Aren't Gonna Need It)
   - KISS (Keep It Simple, Stupid)
   - SOLID principles
   - DRY (Don't Repeat Yourself)

5. **Testing Principles**
   - FIRST (Fast, Independent, Repeatable, Self-validating, Timely)
   - Test Pyramid (many unit, some integration, few e2e)
   - AAA pattern (Arrange, Act, Assert)

---

## 🎯 Agent Selection Guide

### Planning Work

**Need to create a plan?**
- Use: [[ez-planner.md]](./ez-planner.md)
- When: After discuss-phase, before execute-phase
- Input: Phase context, ROADMAP.md goal
- Output: PLAN.md with executable tasks

**Need strategic roadmap?**
- Use: [[ez-roadmapper.md]](./ez-roadmapper.md)
- When: Project initialization, milestone planning
- Input: Requirements, constraints
- Output: ROADMAP.md with phases

---

### Execution Work

**Ready to implement?**
- Use: [[ez-executor.md]](./ez-executor.md)
- When: After plan approved
- Input: PLAN.md
- Output: Working code, commits, SUMMARY.md

**Need to add tests?**
- Use: [[ez-executor.md]](./ez-executor.md) with test focus
- When: After implementation, before verification
- Input: Code files
- Output: Test files, coverage

---

### Verification Work

**Need to verify quality?**
- Use: [[ez-verifier.md]](./ez-verifier.md)
- When: After execution complete
- Input: PLAN.md, code files
- Output: VERIFICATION.md report

**Need to diagnose issues?**
- Use: [[ez-debugger.md]](./ez-debugger.md)
- When: Build/test failures, bugs
- Input: Error logs, failing tests
- Output: DEBUG.md with root cause

---

### Research Work

**Need to understand phase?**
- Use: [[ez-phase-researcher.md]](./ez-phase-researcher.md)
- When: Before planning complex phases
- Input: Phase number, ROADMAP.md
- Output: RESEARCH.md findings

**Need project context?**
- Use: [[ez-project-researcher.md]](./ez-project-researcher.md)
- When: Starting new project
- Input: Codebase, requirements
- Output: Context files

**Mapping existing codebase?**
- Use: [[ez-codebase-mapper.md]](./ez-codebase-mapper.md)
- When: Inheriting legacy project
- Input: Source code
- Output: `.planning/codebase/` docs

---

### Release Work

**Ready for production?**
- Use: [[ez-release-agent.md]](./ez-release-agent.md)
- When: Milestone complete, ready to deploy
- Input: Code, release checklist
- Output: Deployed app, release notes

---

## 🔄 Agent Interaction Patterns

### Standard Phase Flow

```
┌─────────────────┐
│ ez-planner      │
│ (creates plan)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ez-executor     │
│ (implements)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ez-verifier     │
│ (validates)     │
└─────────────────┘
```

### Research Flow

```
┌─────────────────┐
│ ez-phase-       │
│ researcher      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ez-planner      │
│ (uses research) │
└─────────────────┘
```

### Debug Flow

```
┌─────────────────┐
│ ez-debugger     │
│ (diagnoses)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ez-executor     │
│ (fixes issue)   │
└─────────────────┘
```

---

## 🎛️ Model Profiles

### Quality Mode (Default for Complex Work)

| Agent | Model | Rationale |
|-------|-------|-----------|
| ez-planner | Opus | Complex decomposition |
| ez-roadmapper | Opus | Strategic thinking |
| ez-executor | Opus | Implementation quality |
| ez-phase-researcher | Opus | Deep analysis |
| ez-project-researcher | Opus | Comprehensive discovery |
| ez-debugger | Opus | Complex debugging |
| ez-verifier | Sonnet | Pattern matching |
| ez-codebase-mapper | Sonnet | Structural analysis |
| ez-release-agent | Opus | Production safety |

---

### Balanced Mode (Default)

| Agent | Model | Rationale |
|-------|-------|-----------|
| ez-planner | Opus | Planning quality critical |
| ez-roadmapper | Sonnet | Strategic but efficient |
| ez-executor | Sonnet | Quality implementation |
| ez-phase-researcher | Sonnet | Good analysis |
| ez-project-researcher | Sonnet | Balanced discovery |
| ez-debugger | Sonnet | Solid debugging |
| ez-verifier | Sonnet | Consistent verification |
| ez-codebase-mapper | Haiku | Fast mapping |
| ez-release-agent | Sonnet | Safe releases |

---

### Budget Mode (Cost-Optimized)

| Agent | Model | Rationale |
|-------|-------|-----------|
| ez-planner | Sonnet | Planning needs quality |
| ez-roadmapper | Sonnet | Strategy important |
| ez-executor | Haiku | Simple implementations |
| ez-phase-researcher | Haiku | Basic research |
| ez-project-researcher | Haiku | Quick discovery |
| ez-debugger | Sonnet | Debugging needs context |
| ez-verifier | Haiku | Basic verification |
| ez-codebase-mapper | Haiku | Fast, cheap mapping |
| ez-release-agent | Sonnet | Production safety |

---

## 🛠️ Agent Tool Permissions

### Full Access
- **ez-executor:** Read, Write, Edit, Bash, Glob, Grep
- **ez-debugger:** Read, Write, Bash, Glob, Grep

### Standard Access
- **ez-planner:** Read, Write, Bash
- **ez-roadmapper:** Read, Write
- **ez-release-agent:** Read, Write, Bash

### Read-Only
- **ez-verifier:** Read, Bash (for tests)
- **ez-phase-researcher:** Read, Glob, Grep
- **ez-project-researcher:** Read, Glob, Grep
- **ez-codebase-mapper:** Read, Glob, Grep

---

## 📋 Agent Output Format

All agents follow the standard output format:

[[agent-output-format.md]](../templates/agent-output-format.md)

### Required Sections

1. **Decision Log** — Key decisions made
2. **Trade-off Analysis** — Alternatives considered
3. **Artifacts Produced** — Files created/modified
4. **Skills Applied** — Capabilities used
5. **Verification Status** — Quality checks passed

---

## 🔄 Agent Handoff Protocol

When agents hand off context:

[[handoff-protocol.md]](../templates/handoff-protocol.md)

### Handoff Structure

```markdown
## Context from Previous Agent

- Goal: [What we're trying to achieve]
- Decisions: [Key choices made]
- Artifacts: [Files created/modified]
- Open Questions: [Unresolved issues]
- Next Steps: [What the next agent should do]
```

---

## 🧪 Agent Testing

Agent behavior tests:

```bash
npm test -- tests/agents/
```

**Test coverage:**
- `ez-planner.test.ts` — Plan generation
- `ez-executor.test.ts` — Task execution
- `ez-verifier.test.ts` — Verification logic
- `ez-debugger.test.ts` — Debug analysis

---

## 📊 Agent Metrics

Track agent performance:

```bash
node ez-tools.cjs stats --agent ez-executor
```

**Metrics tracked:**
- Token consumption (avg, total)
- Task success rate
- Average execution time
- Quality score (from verifier)

---

## 🎯 Agent Configuration

Configure agent behavior in `.planning/config.json`:

```json
{
  "model_profile": "balanced",
  "agent_overrides": {
    "ez-planner": "opus",
    "ez-executor": "sonnet"
  }
}
```

Or via environment variables:

```bash
export EZ_AGENTS_MODEL_PROFILE=quality
export EZ_AGENTS_MODEL_OVERRIDE_ez_planner=opus
```

---

## See Also

- [[../references/INDEX.md]](../references/INDEX.md) — Reference documentation
- [[../templates/INDEX.md]](../templates/INDEX.md) — Template index
- [[../workflows/INDEX.md]](../workflows/INDEX.md) — Workflow index
- [[../references/model-profiles.md]](../references/model-profiles.md) — Model definitions
- [[../references/model-profile-resolution.md]](../references/model-profile-resolution.md) — Model selection logic

---

**Maintained by:** EZ Agents Core Team  
**Feedback:** Open an issue on GitHub
