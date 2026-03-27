---
ez_plan_version: 1.0
phase: 25
plan: 25
milestone: v5.0
wave: 1
depends_on: []
files_modified:
  - agents/PRINCIPLES.md (new)
  - agents/ez-*.md (21 files, compressed)
  - examples/ (new directory with externalized examples)
requirements:
  - PERF-PROMPT-01 to PERF-PROMPT-06
autonomous: true
---

# Phase 25: Agent Prompt Compression

**Goal:** Compress 21 agent prompt files from ~16,800 lines to ~8,400 lines (50% reduction) using research-backed optimization.

**Requirements:** PERF-PROMPT-01 to PERF-PROMPT-06
**Tests:** Agent prompt validation tests
**Wave:** 1 (single plan, can run autonomously)
**Status:** 📋 Planned

---

## 🔒 Locked Decisions (from Discussion)

### 1. Compression Strategy: BALANCED (50% reduction)
- Remove repetition, externalize examples, YAML frontmatter
- Research-backed: "Simplicity improves accuracy more than length"

### 2. Example Handling: EXTERNALIZE to `/examples/`
- Reference by ID: `@examples/planner-01.md`
- Research-backed: "Providing examples/one-shot" is best practice
- 90% token reduction per agent spawn

### 3. Structure Format: YAML Frontmatter + Markdown Body
- YAML for structured metadata
- Markdown for instructions (narrative)
- Research-backed: "Markdown for narrative, YAML for config"

### 4. Philosophy Sections: SINGLE REFERENCE FILE
- Create `agents/PRINCIPLES.md` (100 lines)
- All 21 agents reference it (5 lines each)
- 95% reduction (2,100 lines → 100 lines)

---

## Must Haves

- [ ] **PERF-PROMPT-01**: Analyze 21 agent files (16,800 lines total)
  - Identify repetition patterns
  - Catalog examples per agent
  - Document philosophy sections

- [ ] **PERF-PROMPT-02**: Remove repetition (philosophy, warnings, principles)
  - Extract common philosophy to PRINCIPLES.md
  - Consolidate repeated warnings
  - Target: 2,100 lines → 100 lines (95% reduction)

- [ ] **PERF-PROMPT-03**: Externalize examples to `/examples/` directory
  - Create examples/ directory
  - Move 400+ lines per agent to external files
  - Reference by ID: `@examples/[agent]-[number].md`
  - Target: 8,400 lines → 4,200 lines (50% reduction)

- [ ] **PERF-PROMPT-04**: Convert to YAML frontmatter + concise body
  - Add YAML frontmatter for metadata (role, goal, constraints, tools)
  - Convert flowing text to bullet points
  - Target: 30% additional reduction

- [ ] **PERF-PROMPT-05**: Target 50-60% size reduction overall
  - Before: 16,800 lines (21 agents × 800 lines)
  - After: ~8,400 lines (100 + 21 × 400 lines)
  - Token savings: 50% per agent spawn

- [ ] **PERF-PROMPT-06**: Measure token savings per agent spawn
  - Document before/after token counts
  - Verify no loss in agent effectiveness
  - Report total savings

---

## Implementation Plan

### Step 1: Create PRINCIPLES.md
```markdown
# agents/PRINCIPLES.md

## Core Philosophy

### Solo Developer Workflow
Planning for ONE person (the user) and ONE implementer (Claude).
- No teams, stakeholders, ceremonies, coordination overhead
- User = visionary/product owner, Claude = builder
- Estimate effort in Claude execution time, not human dev time

### Plans Are Prompts
PLAN.md IS the prompt (not a document that becomes one). Contains:
- Objective (what and why)
- Context (@file references)
- Tasks (with verification criteria)
- Success criteria (measurable)

### Quality Degradation Curve
| Context Usage | Quality | Claude's State |
|---------------|---------|----------------|
| 0-30% | PEAK | Thorough, comprehensive |
| 30-50% | GOOD | Balanced, efficient |
| 50-70% | DECLINING | Repetitive, unfocused |
| 70%+ | POOR | Confused, contradictory |

### Anti-Enterprise Patterns
- Team structures, RACI matrices, stakeholder management
- Sprint ceremonies, change management processes
- ...
```

### Step 2: Create `/examples/` Directory
```
examples/
├── planner-01.md (feature planning)
├── planner-02.md (bug fixing)
├── planner-03.md (refactoring)
├── executor-01.md (task execution)
├── executor-02.md (checkpoint handling)
├── verifier-01.md (UAT creation)
... [~50 example files total]
```

### Step 3: Compress Each Agent File
```yaml
---
# YAML Frontmatter (20 lines)
role: "Senior TypeScript Engineer"
goal: "Phase planning and execution"
model_compatibility:
  claude: true
  qwen: true
constraints:
  - "No breaking changes"
  - "Maintain 70%+ coverage"
tools:
  - "tsc --noEmit"
  - "vitest run"
---

# Markdown Body (380 lines)

## Core Principles
See @agents/PRINCIPLES.md

## Capabilities
[Agent-specific capabilities]

## Instructions
[Bullet points, structured]

## Examples
See @examples/[agent]-01.md
See @examples/[agent]-02.md

## Output Format
[Structured markdown]
```

### Step 4: Validate and Measure
- Count total lines before/after
- Calculate token savings per spawn
- Verify agent effectiveness (no loss in clarity)

---

## Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Lines** | 16,800 lines | ~8,400 lines | 50% reduction |
| **Lines per Agent** | ~800 lines | ~400 lines | 50% reduction |
| **Philosophy Duplication** | 2,100 lines | 100 lines | 95% reduction |
| **Examples** | 8,400 lines (inline) | 4,200 lines (external) | 50% reduction |
| **Token/Spawn** | ~4,000 tokens | ~2,000 tokens | 50% reduction |
| **Cost/100 spawns** | ~$16 | ~$8 | 50% reduction |

---

## Success Criteria

- [ ] PRINCIPLES.md created (100 lines)
- [ ] `/examples/` directory created (~50 files)
- [ ] All 21 agents compressed (400 lines each)
- [ ] YAML frontmatter added to all agents
- [ ] Total reduction: 50% (16,800 → 8,400 lines)
- [ ] Token savings: 50% per spawn
- [ ] No loss in agent effectiveness
- [ ] All references working (`@agents/PRINCIPLES.md`, `@examples/...`)

---

## Notes

**Research-Backed Design:**
- "Simplicity improves accuracy more than length" (Garrett Landers, 2025)
- "Providing examples/one-shot" is best practice (Certara, 2025)
- "Markdown for narrative, YAML for config" (WebCrawlerAPI, 2026)
- "Constraint-based design" reduces token cost (Garrett Landers, 2025)

**Phase 24 Parallel:**
- Same principle: right-sized for CLI use case
- Simple, fast, effective (not over-engineered)
- Research-backed, not guesswork
