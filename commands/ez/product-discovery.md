---
name: ez:product-discovery
description: Product discovery before technical implementation. Validate problem, understand users, define metrics, prioritize features.
argument-hint: "[--commit]"
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
Product discovery before technical implementation.

Validate problem exists, understand user needs, define success metrics, and create product requirements that feed into technical roadmap.

**Output:** `.planning/product/` directory with:
- PROBLEM.md — Validated problem statement
- PERSONAS.md — User personas and JTBD
- METRICS.md — Success metrics (HEART, North Star)
- PRIORITIZATION.md — RICE-scored features
- MVP-PLAN.md — Build-Measure-Learn plan
</objective>

<execution_context>
@~/.claude/ez-agents/workflows/product-discovery.md
@agents/PRINCIPLES.md (Product Thinking Principles section)
</execution_context>

<context>
**Arguments:**
- `--commit` — Commit artifacts to git (default: true if project exists)

**When to use:**
- Before starting new milestone
- When problem is unclear
- When team disagrees on priorities
- Before major investment (multiple phases)

**When NOT to use:**
- Small feature (use /ez:quick)
- Bug fix (use /ez:debug)
- Problem already validated (use /ez:plan-phase)
</context>

<process>
Execute the product-discovery workflow from @~/.claude/ez-agents/workflows/product-discovery.md end-to-end.

Preserve all workflow gates (user research, problem validation, metrics definition, prioritization, MVP planning).
</process>

<success_criteria>
- [ ] User personas created (demographics, goals, pains)
- [ ] User journeys mapped (current state, future state)
- [ ] Problem validated (5 Whys, root cause identified)
- [ ] Hypotheses defined (testable, measurable)
- [ ] North Star Metric defined
- [ ] HEART metrics defined (1-2 per category)
- [ ] Features brainstormed
- [ ] Features prioritized (RICE scoring)
- [ ] Value vs Effort matrix created
- [ ] MVP defined (minimum features to test)
- [ ] Build-Measure-Learn plan created
- [ ] Pivot criteria defined
- [ ] Product requirements documented
- [ ] STATE.md updated
- [ ] Artifacts committed to git
</success_criteria>

<examples>

## Run product discovery for new feature

```
/ez:product-discovery
```

## With explicit commit

```
/ez:product-discovery --commit
```

## When problem is unclear

```
/ez:product-discovery
# Then review .planning/product/PROBLEM.md
```

## Before major milestone

```
/ez:product-discovery
/ez:new-milestone  # Uses product requirements
```

</examples>

<related_commands>
- `/ez:new-project` — Start new project (includes mini discovery)
- `/ez:new-milestone` — Create milestone roadmap
- `/ez:discuss-phase` — Discuss phase context
- `/ez:plan-phase` — Plan phase implementation
- `/ez:quick` — Small ad-hoc tasks
</related_commands>
