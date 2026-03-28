<purpose>
Product discovery before technical implementation.

Validate problem exists, understand user needs, define success metrics, and create product requirements that feed into technical roadmap.

**Output:** `.planning/product/` directory with:
- PROBLEM.md — Validated problem statement
- PERSONAS.md — User personas and JTBD
- METRICS.md — Success metrics (HEART, North Star)
- PRIORITIZATION.md — RICE-scored features
- MVP-PLAN.md — Build-Measure-Learn plan
</purpose>

<required_reading>
@~/.claude/ez-agents/references/ui-brand.md
@agents/PRINCIPLES.md (Product Thinking Principles section)
</required_reading>

<process>

## 0. Initialize

```bash
INIT=$(node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" init product-discovery)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Extract from init JSON: `product_dir`, `commit_docs`, `project_exists`.

**If `project_exists` is false:** Error — run `/ez:new-project` first.

Create product directory:
```bash
mkdir .planning/product
```

---

## 1. User Research

### 1.1 Create User Personas

**Prompt:**
```markdown
<objective>
Create user personas for this product.

For each persona:
- Demographics (age, role, location)
- Goals (what they want to achieve)
- Pains (frustrations, obstacles)
- Current behavior (how they solve problem now)
- Success criteria (what "good" looks like)
</objective>

<format>
## Persona 1: [Name]

**Role:** [job title / user type]
**Demographics:** [age, location, context]

**Goals:**
- [Goal 1]
- [Goal 2]

**Pains:**
- [Pain 1]
- [Pain 2]

**Current Behavior:**
[How they solve this problem today]

**Success Criteria:**
- [What "good" looks like for this persona]
</format>
```

**Write to:** `.planning/product/PERSONAS.md`

---

### 1.2 Map User Journeys

**Prompt:**
```markdown
<objective>
Map user journey for each persona.

For each journey:
- Current state (how they do it now)
- Future state (how they'll do it with our product)
- Touchpoints (where they interact)
- Emotions (frustration → delight)
</objective>

<format>
## Journey: [Persona] → [Goal]

### Current State
1. [Step 1] — [emotion: 😠/😐/😊]
2. [Step 2] — [emotion]
3. [Step 3] — [emotion]

**Pain Points:**
- [Where they get stuck]

### Future State
1. [Step 1] — [emotion: 😠/😐/😊]
2. [Step 2] — [emotion]
3. [Step 3] — [emotion]

**Improvements:**
- [What's better]
</format>
```

**Append to:** `.planning/product/PERSONAS.md`

---

### 1.3 Empathy Maps

**Prompt:**
```markdown
<objective>
Create empathy map for primary persona.

Capture what user:
- Says (quotes, statements)
- Thinks (beliefs, concerns)
- Does (actions, behaviors)
- Feels (emotions, frustrations)
</objective>

<format>
## Empathy Map: [Persona]

| Says | Thinks |
|------|--------|
| "[quote]" | [belief/concern] |

| Does | Feels |
|------|-------|
| [action] | [emotion] |
```

**Append to:** `.planning/product/PERSONAS.md`

---

## 2. Problem Validation

### 2.1 5 Whys Analysis

**Prompt:**
```markdown
<objective>
Get to root cause using 5 Whys.

Start with surface problem, ask "Why?" 5 times.
</objective>

<format>
## 5 Whys: [Surface Problem]

1. **Why?** [Answer 1]
2. **Why?** [Answer 2]
3. **Why?** [Answer 3]
4. **Why?** [Answer 4]
5. **Why?** [Answer 5]

**Root Cause:** [Fundamental problem]

**Validation:**
- [ ] Root cause is actionable
- [ ] Root cause is specific (not vague)
- [ ] Solving root cause prevents surface problems
</format>
```

---

### 2.2 Problem Statement

**Prompt:**
```markdown
<objective>
Write validated problem statement.

Use format:
"[Persona] needs to [job-to-be-done] because [insight], but currently [barrier]."
</objective>

<format>
## Problem Statement

**Primary Problem:**
[Persona] needs to [job-to-be-done] because [insight], but currently [barrier].

**Evidence:**
- [User interview quote]
- [Observed behavior]
- [Metric that shows problem]

**Impact:**
- [Who is affected]
- [How often it happens]
- [Cost of problem (time, money, frustration)]

**Non-Problems (out of scope):**
- [Related problems we're NOT solving]
</format>
```

**Write to:** `.planning/product/PROBLEM.md`

---

### 2.3 Hypothesis Definition

**Prompt:**
```markdown
<objective>
Define testable hypotheses.

For each hypothesis:
- What we believe
- Who it's for
- Expected outcome
- How we'll measure
</objective>

<format>
## Hypotheses

### Hypothesis 1
**We believe** [doing X]
**For** [user persona]
**Will result in** [outcome Y]
**We'll know we're right when** [metric Z improves from A to B]

**Confidence:** [High/Medium/Low]
**Evidence:** [Why we believe this]
</format>
```

**Append to:** `.planning/product/PROBLEM.md`

---

## 3. Define Success Metrics

### 3.1 North Star Metric

**Prompt:**
```markdown
<objective>
Define North Star Metric — the ONE metric that matters most.

Criteria:
- Represents value delivered to users
- Drives business growth
- Actionable (team can influence it)
</objective>

<format>
## North Star Metric

**Metric:** [name]
**Definition:** [how it's calculated]
**Current:** [baseline value]
**Target:** [goal value]
**Timeline:** [by when]

**Why This Metric:**
[Why this represents value delivery]

**Leading Indicators:**
- [Metric 1] — predicts North Star
- [Metric 2] — predicts North Star
```

---

### 3.2 HEART Metrics

**Prompt:**
```markdown
<objective>
Define HEART metrics for user experience.

Pick 1-2 metrics per category.
</objective>

<format>
## HEART Metrics

| Category | Metric | Current | Target | How to Measure |
|----------|--------|---------|--------|----------------|
| **Happiness** | NPS | [baseline] | [target] | [survey method] |
| **Engagement** | DAU/MAU | [baseline] | [target] | [analytics] |
| **Adoption** | Signups/week | [baseline] | [target] | [analytics] |
| **Retention** | D7 retention | [baseline] | [target] | [cohort analysis] |
| **Task Success** | Completion rate | [baseline] | [target] | [funnel analysis] |
```

**Write to:** `.planning/product/METRICS.md`

---

### 3.3 OKRs (Optional)

**Prompt:**
```markdown
<objective>
Define Objectives and Key Results.

1 Objective (qualitative goal)
3-4 Key Results (quantitative measures)
</objective>

<format>
## OKRs — [Quarter/Timeframe]

### Objective
[Qualitative, inspirational goal]

### Key Results
- **KR1:** [Quantitative measure] from [X] to [Y]
- **KR2:** [Quantitative measure] from [X] to [Y]
- **KR3:** [Quantitative measure] from [X] to [Y]
- **KR4:** [Quantitative measure] from [X] to [Y]

**Confidence:** [How confident we are (50% = stretch goal)]
```

**Append to:** `.planning/product/METRICS.md`

---

## 4. Feature Prioritization

### 4.1 Feature Brainstorm

**Prompt:**
```markdown
<objective>
Brainstorm features that solve validated problems.

For each feature:
- Name
- Problem it solves
- User benefit
- Initial effort estimate (S/M/L/XL)
</objective>

<format>
## Feature Ideas

| Feature | Problem Solved | User Benefit | Effort |
|---------|---------------|--------------|--------|
| [Name] | [Problem ID] | [Benefit] | S/M/L/XL |
```

---

### 4.2 RICE Scoring

**Prompt:**
```markdown
<objective>
Score features using RICE framework.

Calculate RICE Score = (Reach × Impact × Confidence) / Effort
</objective>

<format>
## RICE Prioritization

| Feature | Reach (1-1000) | Impact (0.25-3) | Confidence (0-100%) | Effort (weeks) | RICE Score |
|---------|----------------|-----------------|---------------------|----------------|------------|
| [Name] | [number] | [number] | [number]% | [number] | [calculate] |

**Prioritized List:**
1. [Feature 1] — RICE: [score]
2. [Feature 2] — RICE: [score]
3. [Feature 3] — RICE: [score]
```

**Write to:** `.planning/product/PRIORITIZATION.md`

---

### 4.3 Value vs Effort Matrix

**Prompt:**
```markdown
<objective>
Plot features on Value vs Effort matrix.

Categorize:
- Quick Wins (High Value, Low Effort)
- Major Projects (High Value, High Effort)
- Fill-Ins (Low Value, Low Effort)
- Time Wasters (Low Value, High Effort)
</objective>

<format>
## Value vs Effort Matrix

```
High Value │ Quick Wins      │ Major Projects
           │ [Feature A]     │ [Feature B]
           │ [Feature C]     │ [Feature D]
───────────┼─────────────────┼─────────────────
           │                 │
Low Value  │ Fill-Ins        │ Time Wasters
           │ [Feature E]     │ [Feature F]
           │                 │
           └─────────────────┴─────────────────
             Low Effort    High Effort
```

**Do First:** Quick Wins
**Plan Carefully:** Major Projects
**Do If Time:** Fill-Ins
**Avoid:** Time Wasters
```

**Append to:** `.planning/product/PRIORITIZATION.md`

---

## 5. Build-Measure-Learn Plan

### 5.1 MVP Definition

**Prompt:**
```markdown
<objective>
Define MVP — minimum features to test hypothesis.

MVP = smallest thing we can build to learn
</objective>

<format>
## MVP Definition

**Hypothesis to Test:**
[Primary hypothesis from PROBLEM.md]

**MVP Features:**
1. [Feature 1] — [why it's essential]
2. [Feature 2] — [why it's essential]
3. [Feature 3] — [why it's essential]

**NOT in MVP (deferred):**
- [Feature X] — [why it can wait]
- [Feature Y] — [why it can wait]

**MVP Type:**
- [ ] Landing Page MVP (test demand)
- [ ] Concierge MVP (manual service)
- [ ] Wizard of Oz MVP (fake automation)
- [ ] Piecemeal MVP (glue existing tools)
- [ ] Functional MVP (minimal product)
```

---

### 5.2 Build-Measure-Learn Cycle

**Prompt:**
```markdown
<objective>
Define BML cycle with pivot criteria.
</objective>

<format>
## Build-Measure-Learn Plan

### BUILD
**What:** [MVP features]
**Timeline:** [X weeks]
**Success Criteria:** [MVP is "done" when...]

### MEASURE
**Metrics to Track:**
- [North Star Metric]
- [HEART metrics]
- [Leading indicators]

**Data Collection:**
- [Analytics setup]
- [User interviews schedule]
- [Feedback mechanism]

### LEARN
**Validation Criteria:**
- **Validated:** [metric] improves from [X] to [Y]
- **Invalidated:** [metric] stays same or worsens

### PIVOT or PERSEVERE
**Pivot if:**
- [Hypothesis invalidated]
- [User feedback negative]
- [Better opportunity found]

**Persevere if:**
- [Hypothesis validated]
- [Metrics improving]
- [Clear path to PMF]
```

**Write to:** `.planning/product/MVP-PLAN.md`

---

## 6. Handoff to Roadmap

### 6.1 Create Product Requirements

**Prompt:**
```markdown
<objective>
Translate product discovery into requirements for roadmap.

Each requirement has:
- REQ-ID (e.g., PROD-01)
- Problem it solves
- Success metric
- Priority (from RICE)
</objective>

<format>
## Product Requirements

### REQ-PROD-01: [Feature Name]
**Problem:** [Links to PROBLEM.md]
**User Benefit:** [What users gain]
**Success Metric:** [How we measure success]
**Priority:** [RICE score, rank]
**MVP:** [Yes/No]
```

**Write to:** `.planning/product/REQUIREMENTS.md`

---

### 6.2 Update STATE.md

```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" state update \
  --section "Product Discovery" \
  --value "Complete — $(date -u +"%Y-%m-%d")"
```

---

## 7. Commit Artifacts

**If `commit_docs` is true:**
```bash
node "$HOME/.claude/ez-agents/dist/bin/ez-tools.js" commit \
  "docs(product): complete product discovery" \
  --files .planning/product/
```

---

## 8. Present Results

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 EZ ► PRODUCT DISCOVERY COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Problem Validated:** [yes/no]
**Personas Created:** [count]
**Success Metrics Defined:** [count]
**Features Prioritized:** [count]
**MVP Defined:** [yes/no]

**Artifacts Created:**
- `.planning/product/PROBLEM.md`
- `.planning/product/PERSONAS.md`
- `.planning/product/METRICS.md`
- `.planning/product/PRIORITIZATION.md`
- `.planning/product/MVP-PLAN.md`
- `.planning/product/REQUIREMENTS.md`

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Create Technical Roadmap** — Translate product requirements into phases

`/ez:new-milestone` or `/ez:plan-phase`

<sub>Product discovery complete. Ready for technical planning.</sub>

───────────────────────────────────────────────────────────────
```

---

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

## When to use

- Before starting new milestone
- When problem is unclear
- When team disagrees on priorities
- Before major investment (multiple phases)

## When NOT to use

- Small feature (use /ez:quick)
- Bug fix (use /ez:debug)
- Problem already validated (use /ez:plan-phase)

</examples>

<related_commands>
- `/ez:new-project` — Start new project (includes mini discovery)
- `/ez:new-milestone` — Create milestone roadmap
- `/ez:discuss-phase` — Discuss phase context
- `/ez:plan-phase` — Plan phase implementation
</related_commands>
