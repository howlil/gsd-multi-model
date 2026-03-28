---
phase: {phase-number}-{phase-slug}
status: open
participants: [ez-planner, ez-executor, ez-verifier]
opened: {timestamp}
consensus: pending
---

# Phase {X}: {Name} — Pre-Execution Discussion

**Purpose:** Parallel agent perspectives before phase execution. Orchestrator reads consensus before spawning executors.

---

## Planning Perspective (ez-planner)

> *Populated by ez-planner during plan-phase*

{Populated during plan-phase — task breakdown, dependencies, must_haves}

---

## Execution Perspective (ez-executor)

> *Populated by ez-executor during execute-phase pre-flight*

{Populated during execute-phase pre-flight — feasibility check, risk assessment}

---

## Verification Perspective (ez-verifier)

> *Populated by ez-verifier during plan review*

{Populated during plan review — goal-backward criteria, anti-pattern scan}

---

## Consensus

> *Synthesized by orchestrator from above perspectives*

**Status:** {open | consensus-reached | needs-human}

### Blockers
{List any hard blockers from any agent, or "None"}

### Key Warnings
{List significant warnings, or "None"}

### Go / No-Go
{GO — proceed to execution | NO-GO — resolve blockers first | HUMAN-NEEDED — requires user input}

### Rationale
{1-2 sentences explaining the consensus decision}

---

*Discussion opened: {timestamp}*
*Last updated: {timestamp}*
