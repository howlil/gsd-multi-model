---
phase: 25-agent-prompt-compression
created: 2026-03-27
status: in_progress
---

# Phase 25: Agent Prompt Compression — Implementation Decisions

## Overview

**Goal:** Compress 21 agent prompt files from ~16,800 lines to ~8,400 lines (50% reduction)

**Status:** 🔄 IN PROGRESS

**Research-Backed:** All decisions based on 2024-2025 prompt engineering research

---

## 🔒 Locked Decisions

### 1. **Compression Strategy: BALANCED (50% reduction)** ✅

**Decision:** Remove repetition, externalize examples, add YAML frontmatter

**Rationale:**
- Research: "Simplicity improves accuracy more than length" (Garrett Landers, 2025)
- 50% achieves token savings without sacrificing agent effectiveness
- Phase 24 parallel: 66% token reduction was optimal (not 90%)

**Implementation:**
```yaml
# Before (800 lines per agent):
- Philosophy: 100 lines (repeated)
- Examples: 400 lines (inline)
- Instructions: 300 lines (flowing text)

# After (400 lines per agent):
- Philosophy: 5 lines (reference PRINCIPLES.md)
- Examples: 5 lines (reference /examples/)
- Instructions: 390 lines (bullet points, YAML frontmatter)
```

**Downstream Impact:**
- Researcher: No need to research compression algorithms
- Planner: Target is 50%, not aggressive 70%

---

### 2. **Example Handling: EXTERNALIZE to `/examples/`** ✅

**Decision:** Move 400+ lines per agent to external files, reference by ID

**Rationale:**
- Research: "Providing examples/one-shot" is best practice (Certara, 2025)
- 21 agents × 400 lines = 8,400 lines of repetition
- Externalize → 90% token reduction per spawn

**Implementation:**
```markdown
# Before (inline):
## Examples (400 lines)
Example 1: User asks for feature...
Example 2: User reports bug...
Example 3: User wants refactoring...

# After (externalized):
## Examples
See @examples/planner-01.md (feature planning)
See @examples/planner-02.md (bug fixing)
See @examples/planner-03.md (refactoring)
```

**Benefits:**
- ✅ 90% token reduction per agent spawn
- ✅ Examples still available (not removed)
- ✅ Easier to update (single source of truth)
- ✅ Coherence preserved (Phase 24 principle)

**Downstream Impact:**
- Researcher: No need to research example removal
- Planner: Create ~50 example files total

---

### 3. **Structure Format: YAML Frontmatter + Markdown Body** ✅

**Decision:** Hybrid format (YAML for metadata, Markdown for instructions)

**Rationale:**
- Research: "Markdown best for narrative, YAML best for config-like data" (WebCrawlerAPI, 2026)
- Agent prompts = metadata (YAML) + instructions (Markdown)
- Phase 24 parallel: Structured output with reasoning

**Implementation:**
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
```

```markdown
# Markdown Body (380 lines)

## Core Principles
See @agents/PRINCIPLES.md

## Capabilities
- Capability 1
- Capability 2

## Instructions
1. Step 1
2. Step 2
```

**Benefits:**
- ✅ Optimal LLM performance (research-backed)
- ✅ Human-readable (markdown)
- ✅ Machine-parseable (YAML metadata)
- ✅ Consistent structure across agents

**Downstream Impact:**
- Researcher: No need to research JSON/XML formats
- Planner: Use YAML + Markdown hybrid

---

### 4. **Philosophy Sections: SINGLE REFERENCE FILE** ✅

**Decision:** Create `agents/PRINCIPLES.md`, all 21 agents reference it

**Rationale:**
- Research: "Constraint-based design" reduces token cost (Garrett Landers, 2025)
- 21 agents × 100 lines = 2,100 lines of repeated philosophy
- Single file → 95% reduction (2,100 → 100 lines)

**Clarification:**
- ❌ **NOT reducing agent count** — Still 21 agents
- ❌ **NOT making skills general** — Each agent stays specialized
- ✅ **Removing DUPLICATION** — Only repeated philosophy

**Implementation:**
```markdown
# agents/PRINCIPLES.md (NEW FILE, ~100 lines)
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

```markdown
# agents/ez-planner.md (NOW 400 lines, was 800)
## Core Principles
See @agents/PRINCIPLES.md

## Agent-Specific Capabilities
[Only planner-specific content here]

## Agent-Specific Examples
[Only planner-specific examples here]
```

**Benefits:**
- ✅ 95% reduction (2,100 lines → 100 lines)
- ✅ Consistency (single source of truth)
- ✅ Easier to update (one file)
- ✅ Self-contained agents (reference, not remove)

**Downstream Impact:**
- Researcher: No need to research philosophy removal
- Planner: Create PRINCIPLES.md first, then update all agents

---

## ⚠️ Gray Areas Resolved

### 1. **Agent Count Reduced?**
**Decision:** ❌ NO — Still 21 agents

**Why:**
- Each agent has UNIQUE capabilities
- Each agent has UNIQUE examples
- Only DUPLICATION is removed (philosophy)

**If User Asks Later:**
> "Agent count remains 21. Only duplicated philosophy is externalized."

---

### 2. **Skills Become General?**
**Decision:** ❌ NO — Skills remain specialized

**Why:**
- ez-planner: Still specialized in planning
- ez-executor: Still specialized in execution
- ez-verifier: Still specialized in verification
- Only philosophy is shared

**If User Asks Later:**
> "Skills remain specialized per agent. PRINCIPLES.md only contains shared philosophy."

---

### 3. **Examples Removed?**
**Decision:** ❌ NO — Examples externalized, not removed

**Why:**
- Research: "Providing examples/one-shot" is best practice
- Examples moved to `/examples/` directory
- Referenced by ID: `@examples/planner-01.md`

**If User Asks Later:**
> "Examples are externalized for 90% token reduction, but still available."

---

### 4. **Aggressive Compression (70%)?**
**Decision:** ❌ NO — Balanced (50%)

**Why:**
- Research: "Simplicity improves accuracy" — but too minimal loses clarity
- 50% achieves savings without sacrificing effectiveness
- Phase 24 parallel: 66% was optimal (not 90%)

**If User Asks Later:**
> "50% compression is research-backed optimal balance."

---

## 📊 Performance Metrics (Locked)

| Metric | Target | Achieved | Status |
|--------|--------|----------|--------|
| **Total Lines** | 16,800 → 8,400 | TBD | 🔄 In Progress |
| **Lines per Agent** | 800 → 400 | TBD | 🔄 In Progress |
| **Philosophy Duplication** | 2,100 → 100 | TBD | 🔄 In Progress |
| **Token/Spawn** | ~4,000 → ~2,000 | TBD | 🔄 In Progress |
| **Cost/100 spawns** | ~$16 → ~$8 | TBD | 🔄 In Progress |

---

## 📋 Implementation Checklist

- [ ] Create `agents/PRINCIPLES.md` (~100 lines)
- [ ] Create `examples/` directory
- [ ] Create ~50 example files in `examples/`
- [ ] Update all 21 agent files:
  - [ ] Add YAML frontmatter (20 lines)
  - [ ] Replace philosophy with reference (5 lines)
  - [ ] Replace inline examples with references (5 lines)
  - [ ] Convert instructions to bullet points
- [ ] Validate all references work
- [ ] Measure before/after metrics
- [ ] Document token savings

---

## 🔧 Implementation Details (For Downstream)

### Files Created:
- `agents/PRINCIPLES.md` (~100 lines)
- `examples/planner-01.md` to `examples/verifier-03.md` (~50 files)

### Files Modified:
- `agents/ez-planner.md` (800 → 400 lines)
- `agents/ez-executor.md` (800 → 400 lines)
- `agents/ez-verifier.md` (800 → 400 lines)
- ... [18 more agents]

### Expected Impact:
- Total lines: 16,800 → 8,400 (50% reduction)
- Token/spawn: ~4,000 → ~2,000 (50% reduction)
- Cost/100 spawns: ~$16 → ~$8 (50% reduction)

---

## 📋 Next Phase Handoff

**Phase 26: Logging & Observability Optimization**

**Context from Phase 25:**
- Same principles apply: simple, fast, right-sized
- YAML frontmatter pattern can be reused
- Externalization pattern (examples) can be applied to other areas

**Lessons Learned:**
- Research-first approach works (avoided over-engineering)
- 50% compression is optimal (not 70%)
- Externalization preserves coherence while reducing tokens

---

*Created: 2026-03-27*
*Decisions locked for downstream agents*
*Research-backed: 2024-2025 prompt engineering best practices*
