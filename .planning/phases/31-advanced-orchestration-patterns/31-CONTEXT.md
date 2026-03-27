---
phase: 31-advanced-orchestration-patterns
created: 2026-03-27
status: ready_for_research
---

# Phase 31: Advanced Orchestration Patterns — Implementation Decisions

## Overview

**Goal:** Implement 7 advanced orchestration patterns to improve reliability, scalability, and flexibility of agent coordination.

**Status:** 🔒 **DECISIONS LOCKED** — Ready for research and planning

**Position:** Phase 31 of 31 (final phase of Part 5: Performance Optimization)

---

## 🔒 Locked Decisions (Cannot Change)

### 1. **7 Patterns to Implement** ✅

**Decision:** Implement all 7 patterns identified in GAP analysis

| Pattern | Priority | Complexity | Reliability Impact | Status |
|---------|----------|------------|-------------------|--------|
| **Router** | 🔥 High | Medium | +15-20% | 🔒 Locked |
| **Handoff Manager** | Medium | Medium | +10-15% | 🔒 Locked |
| **Peer Mesh** | 🔥 High | High | +25-30% | 🔒 Locked |
| **Subagents** | Medium | Low | +10% | 🔒 Locked |
| **Group Chat** | Medium | Medium | +10-15% | 🔒 Locked |
| **Swarm** | Low | High | +20-25% | 🔒 Locked |
| **Magentic** | Low | Very High | +15-20% | 🔒 Locked |

**Rationale:**
- Research-backed patterns from 2024-2025 enterprise AI deployments
- Complements existing Chief Strategist orchestrator
- Addresses identified reliability gaps (Exit Code 143, timeout issues)
- Enables sequential workflows, parallel exploration, dynamic orchestration

**Downstream Impact:**
- Researcher: Research all 7 patterns, identify libraries/tools
- Planner: Create implementation plans for each pattern
- Executor: Implement patterns in priority order

---

### 2. **Implementation Priority** ✅

**Decision:** Implement in this order:

1. **Router Pattern** — Quick win, complements Chief Strategist
2. **Handoff Manager** — Enables sequential workflows
3. **Peer Mesh** — 25-30% reliability boost (high impact)
4. **Subagents** — Clean context isolation
5. **Group Chat** — Maker-checker loops
6. **Swarm** — Parallel exploration for research
7. **Magentic** — Dynamic orchestration for complex problems

**Rationale:**
- Start with low-complexity, high-impact patterns
- Build foundation before advanced patterns
- Each pattern enables the next

---

### 3. **Pattern Definitions** ✅

#### **Router Pattern**
**Purpose:** Classify and route work to appropriate agents
**Implementation:** WorkRouter class with classify/route/fan-out/fan-in
**Use Case:** Triage support → route to technical/financial agent

#### **Handoff Manager**
**Purpose:** State persistence across agent handoffs
**Implementation:** HandoffManager with saveState/loadState/handoff protocol
**Use Case:** Customer support flows (triage → technical → billing)

#### **Peer Mesh**
**Purpose:** Agent-to-agent communication without central orchestrator
**Implementation:** AgentMesh with taskPool, mailboxes, coordination primitives
**Use Case:** Multi-agent coding loops (planner↔coder↔tester)

#### **Subagents**
**Purpose:** Centralized control with context isolation
**Implementation:** SubagentCoordinator with supervisor, subagent pool, tool-based calling
**Use Case:** Personal assistant (calendar + email + CRM)

#### **Group Chat**
**Purpose:** Multi-agent discussion and consensus
**Implementation:** AgentChatRoom with brainstorm, debate, maker-checker modes
**Use Case:** Architecture review, compliance validation

#### **Swarm**
**Purpose:** Parallel exploration with emergent coordination
**Implementation:** AgentSwarm with blackboard, autonomous agents, convergence detection
**Use Case:** Research flows, competitive intelligence

#### **Magentic**
**Purpose:** Dynamic orchestration for open-ended problems
**Implementation:** TaskLedgerManager with dynamic ledger, tool-equipped agents
**Use Case:** SRE incident response, complex debugging

---

### 4. **Integration with Existing Architecture** ✅

**Decision:** Patterns integrate with existing Chief Strategist orchestrator

**Current Architecture:**
```
Chief Strategist (central orchestrator)
├── Specialist Agents (Backend, Frontend, QA, etc.)
└── Context Engine (Phase 37)
```

**After Phase 31:**
```
Chief Strategist (central orchestrator)
├── Router Pattern (classification + routing)
├── Handoff Manager (state persistence)
├── Peer Mesh (agent-to-agent communication)
├── Subagents (context isolation)
├── Group Chat (multi-agent discussion)
├── Swarm (parallel exploration)
└── Magentic (dynamic orchestration)
```

**Key Integration Points:**
- Router Pattern: Extends Chief Strategist's work classification
- Handoff Manager: Integrates with Context Engine for state persistence
- Peer Mesh: Alternative to Chief Strategist for peer-to-peer workflows
- Subagents: Extends existing agent spawning mechanism
- Group Chat: New discussion mode for complex decisions
- Swarm: Parallel research/execution mode
- Magentic: Dynamic task-ledger for open-ended problems

---

### 5. **Success Criteria** ✅

**Decision:** Measure success by reliability improvement

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| **Reliability** | Baseline | +15-30% | Task completion rate |
| **Timeout Errors** | Exit Code 143 | 0 | CLI timeout incidents |
| **Context Isolation** | Shared context | Isolated per subagent | Context leakage incidents |
| **Sequential Workflows** | Manual handoffs | Automated | Handoff success rate |
| **Parallel Exploration** | Single agent | Swarm mode | Research coverage |

---

## ⚠️ Gray Areas Resolved

### 1. **Pattern Selection**
**Decision:** All 7 patterns from GAP analysis

**Why:**
- Each pattern addresses specific reliability gap
- Patterns are complementary, not redundant
- Research-backed from enterprise deployments

**If User Asks Later:**
> "All 7 patterns are locked based on GAP analysis. Can prioritize differently if needed."

---

### 2. **Implementation Order**
**Decision:** Priority order locked (Router → Handoff → Peer Mesh → Subagents → Group Chat → Swarm → Magentic)

**Why:**
- Low-complexity first (Router, Handoff)
- High-impact early (Peer Mesh at #3)
- Foundation before advanced (Swarm, Magentic last)

**If User Asks Later:**
> "Priority order is locked for incremental complexity. Can reprioritize if specific pattern is blocking."

---

### 3. **Integration Approach**
**Decision:** Integrate with existing Chief Strategist (not replace)

**Why:**
- Chief Strategist already handles classification/routing
- Patterns extend, not replace, existing functionality
- Backward compatible with existing workflows

**If User Asks Later:**
> "Patterns integrate with Chief Strategist. Not replacing existing orchestrator."

---

### 4. **Success Metrics**
**Decision:** Measure reliability improvement (+15-30%)

**Why:**
- Reliability is core goal of Phase 31
- Measurable via task completion rate
- Timeout errors (Exit Code 143) are concrete metric

**If User Asks Later:**
> "Success = +15-30% reliability improvement. Measured via task completion rate and timeout incidents."

---

## 📋 Code Context

### **Existing Assets to Reuse:**

| Asset | Location | Reuse For |
|-------|----------|-----------|
| Chief Strategist | `agents/ez-chief-strategist.md` | Router Pattern integration |
| Context Engine | Phase 37 | Handoff Manager state persistence |
| Agent Scaffolding | `agents/*.md` | Subagents pattern |
| Discussion System | `bin/lib/discussion-synthesizer.ts` | Group Chat pattern |
| Parallel Execution | Phase 25 learnings | Swarm pattern |

### **New Files to Create:**

| File | Pattern | Purpose |
|------|---------|---------|
| `bin/lib/orchestration/WorkRouter.ts` | Router | Classification + routing |
| `bin/lib/orchestration/HandoffManager.ts` | Handoff | State persistence |
| `bin/lib/orchestration/AgentMesh.ts` | Peer Mesh | Agent-to-agent communication |
| `bin/lib/orchestration/SubagentCoordinator.ts` | Subagents | Context isolation |
| `bin/lib/orchestration/AgentChatRoom.ts` | Group Chat | Multi-agent discussion |
| `bin/lib/orchestration/AgentSwarm.ts` | Swarm | Parallel exploration |
| `bin/lib/orchestration/TaskLedgerManager.ts` | Magentic | Dynamic orchestration |

---

## 📊 Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Reliability** | Baseline | +15-30% | Measurable |
| **Timeout Errors** | Exit Code 143 | 0 | Eliminated |
| **Context Isolation** | Shared | Isolated | 100% isolation |
| **Sequential Workflows** | Manual | Automated | 100% automated |
| **Parallel Exploration** | Single agent | Swarm | 10x coverage |

---

## 🎯 Next Steps

**Ready for:** `/ez:plan-phase 31`

**Research Needed:**
- Router Pattern libraries/tools
- Handoff Manager state persistence patterns
- Peer Mesh communication protocols
- Subagents context isolation patterns
- Group Chat consensus algorithms
- Swarm coordination mechanisms
- Magentic task-ledger patterns

**Planning Output:**
- 7 plans (one per pattern)
- Implementation order as locked
- Success criteria per pattern

---

*Created: 2026-03-27*
*Decisions locked for downstream agents*
*Ready for research and planning*
