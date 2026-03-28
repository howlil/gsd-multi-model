---
name: agent_systems_v1
description: Multi-agent architecture patterns, agent orchestration, coordination strategies, and production agent system design
version: 1.0.0
tags: [ai, agents, multi-agent, orchestration, llm, agent-architecture, ai-systems]
category: ai
triggers:
  keywords: [agent, multi-agent, agent-system, agent-orchestration, ai-agents, autonomous-agents]
  filePatterns: [agent/*.ts, orchestrator/*.ts, agent-system/*.ts]
  commands: [agent design, multi-agent architecture]
  projectArchetypes: [ai-platform, agent-system, automation-platform]
  modes: [greenfield, architecture-review, scaling]
prerequisites:
  - ai_llm_integration_skill_v1
  - event_driven_v1
  - microservices_v1
recommended_structure:
  directories:
    - src/agents/
    - src/agents/base/
    - src/agents/specialists/
    - src/orchestrator/
    - src/agent-registry/
    - src/agent-communication/
    - src/agent-state/
workflow:
  setup:
    - Define agent roles and responsibilities
    - Design communication protocols
    - Establish coordination patterns
    - Set up agent registry
  generate:
    - Implement base agent class
    - Create specialist agents
    - Build orchestrator/supervisor
    - Implement message routing
  test:
    - Individual agent unit tests
    - Agent interaction tests
    - System-level orchestration tests
    - Load and stress tests
best_practices:
  - Start with single agent + tools before multi-agent
  - Use clear role separation between agents
  - Implement proper exit conditions to prevent loops
  - Monitor coordination tax (latency, cost, complexity)
  - Use hybrid architectures for production systems
  - Implement agent state management
  - Design for failure and recovery
  - Track agent performance metrics
anti_patterns:
  - Adding agents without clear need (coordination overhead)
  - Using prompt tweaks to fix architectural problems
  - No exit conditions leading to infinite loops
  - Tight coupling between agents
  - Missing state management
  - No monitoring or observability
  - Allowing unbounded context growth
tools:
  - LangChain/LangGraph
  - AutoGen
  - CrewAI
  - Semantic Kernel
  - Custom orchestrators
metrics:
  - Agent response time (p50, p95, p99)
  - Task completion rate
  - Coordination overhead (latency added per agent)
  - Token usage per agent/per task
  - Error rate per agent
  - System throughput (tasks/minute)
---

# Agent Systems Skill

## Overview

This skill provides comprehensive guidance on designing and implementing multi-agent AI systems, including architecture patterns, coordination strategies, orchestration mechanisms, and production-ready agent system design.

Multi-agent systems (MAS) enable building complex AI applications by decomposing tasks across specialized agents that collaborate to achieve goals. This skill covers when to use multi-agent architectures, which patterns to apply, and how to avoid common pitfalls.

## When to Use

- **Complex workflows** requiring multiple specialized capabilities
- **Domain separation** where different knowledge areas don't fit in single context
- **Parallel processing** needs for independent subtasks
- **Distributed development** with multiple teams owning different capabilities
- **Scalability requirements** beyond single agent capacity
- **Specialized reasoning** requiring different model types (thinkers vs generators)

## When NOT to Use

- **Simple tasks** that a single agent with tools can handle
- **Cost-sensitive** applications (multi-agent adds overhead)
- **Low-latency requirements** (each agent adds latency)
- **Early-stage prototypes** (start simple, add complexity when needed)
- **When coordination overhead** exceeds value of specialization

---

## Core Concepts

### 1. Multi-Agent Architecture Patterns

#### Pattern 1: Subagents (Supervisor-Based)

```
┌─────────────────────────────────────┐
│         Supervisor Agent            │
│    (Planning, Delegation, Decision) │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┬──────────┐
    │          │          │          │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐  ┌──▼──┐
│Agent A│  │Agent B│  │Agent C│  │Agent D│
│(Code) │  │(Test) │  │(Docs) │  │(Review)│
└───────┘  └───────┘  └───────┘  └───────┘
```

**Characteristics:**
- Central supervisor coordinates specialized, stateless subagents
- Subagents act as tools called by supervisor
- Centralized orchestration and decision-making
- Best for: Multiple distinct domains needing centralized workflow control

**Tradeoffs:**
- ✅ Context isolation between agents
- ✅ Clear responsibility separation
- ✅ Parallel execution possible
- ❌ Adds one extra model call per interaction (latency/cost)
- ❌ Single point of failure (supervisor)

**Implementation:**
```typescript
interface Agent {
  name: string;
  description: string;
  execute(input: string, context: AgentContext): Promise<AgentResult>;
}

interface Supervisor {
  plan(task: string): Promise<ExecutionPlan>;
  delegate(agent: Agent, task: string): Promise<AgentResult>;
  synthesize(results: AgentResult[]): Promise<string>;
}

class AgentOrchestrator {
  private agents: Map<string, Agent> = new Map();
  private supervisor: Supervisor;

  async execute(task: string): Promise<string> {
    const plan = await this.supervisor.plan(task);
    const results: AgentResult[] = [];

    for (const step of plan.steps) {
      const agent = this.agents.get(step.agentName);
      if (!agent) throw new Error(`Agent ${step.agentName} not found`);
      
      const result = await agent.execute(step.task, step.context);
      results.push(result);
    }

    return await this.supervisor.synthesize(results);
  }
}
```

#### Pattern 2: Skills (Progressive Disclosure)

```
┌─────────────────────────────────────────┐
│         Single Agent                    │
│  ┌───────────────────────────────────┐  │
│  │  Skill: Code Review              │  │
│  │  Skill: Testing                  │  │
│  │  Skill: Documentation            │  │
│  │  Skill: Refactoring              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Characteristics:**
- Single agent loads specialized prompts/knowledge on-demand
- Progressive disclosure of capabilities
- Lightweight composition without orchestration overhead
- Best for: Single agents with many specializations

**Tradeoffs:**
- ✅ No orchestration overhead
- ✅ Simpler architecture
- ✅ Lower latency
- ❌ Context accumulates in conversation history (token bloat)
- ❌ Less isolation between specializations

**Implementation:**
```typescript
interface Skill {
  name: string;
  trigger: RegExp;
  systemPrompt: string;
  examples: string[];
}

class SkillManager {
  private skills: Skill[] = [];
  private activeSkills: Set<string> = new Set();

  registerSkill(skill: Skill) {
    this.skills.push(skill);
  }

  detectSkills(userInput: string): Skill[] {
    return this.skills.filter(skill => 
      skill.trigger.test(userInput)
    );
  }

  activateSkills(skills: Skill[]) {
    for (const skill of skills) {
      this.activeSkills.add(skill.name);
    }
  }

  buildSystemPrompt(): string {
    const activeSkills = this.skills.filter(s => 
      this.activeSkills.has(s.name)
    );
    
    return activeSkills.map(s => s.systemPrompt).join('\n\n');
  }
}
```

#### Pattern 3: Handoffs (State-Driven Transitions)

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Agent A │───>│  Agent B │───>│  Agent C │
│ (Greet)  │    │ (Qualify)│    │ (Solve)  │
└──────────┘    └──────────┘    └──────────┘
     │               │               │
     └───────────────┴───────────────┘
              State Context
```

**Characteristics:**
- Active agent changes dynamically based on conversation context
- State-driven transitions between agents
- Context carries forward through handoffs
- Best for: Sequential workflows, multi-stage conversations

**Tradeoffs:**
- ✅ Natural conversation flow
- ✅ State persistence across agents
- ✅ Clear workflow stages
- ❌ Requires careful state management
- ❌ Complex transition logic

**Implementation:**
```typescript
interface AgentState {
  currentAgent: string;
  context: Record<string, any>;
  history: Message[];
}

interface HandoffCondition {
  fromAgent: string;
  toAgent: string;
  condition: (state: AgentState, input: string) => boolean;
}

class HandoffManager {
  private agents: Map<string, Agent> = new Map();
  private handoffs: HandoffCondition[] = [];
  private state: AgentState;

  async process(input: string): Promise<string> {
    const currentAgent = this.agents.get(this.state.currentAgent);
    
    // Check for handoff conditions
    for (const handoff of this.handoffs) {
      if (handoff.fromAgent === this.state.currentAgent &&
          handoff.condition(this.state, input)) {
        this.state.currentAgent = handoff.toAgent;
        return await this.process(input); // Re-process with new agent
      }
    }

    const result = await currentAgent!.execute(input, this.state.context);
    this.state.history.push({ role: 'user', content: input });
    this.state.history.push({ role: 'assistant', content: result });
    return result;
  }
}
```

#### Pattern 4: Router (Parallel Specialization)

```
                    ┌─────────────┐
                    │   Router    │
                    │ (Classifier)│
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
    │ Agent A │      │ Agent B │      │ Agent C │
    │(Legal)  │      │(Tech)   │      │(Billing)│
    └────┬────┘      └────┬────┘      └────┬────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Synthesizer│
                    └─────────────┘
```

**Characteristics:**
- Router classifies input and directs to specialized agents
- Can execute multiple agents in parallel
- Synthesizer combines results
- Best for: Distinct verticals, parallel queries, result synthesis

**Tradeoffs:**
- ✅ Parallel execution efficiency
- ✅ Clear specialization
- ✅ Stateless design (consistent performance)
- ❌ Routing overhead
- ❌ Requires synthesis logic

**Implementation:**
```typescript
interface RouterConfig {
  categories: string[];
  routingPrompt: string;
}

class RouterAgent {
  private config: RouterConfig;
  private agents: Map<string, Agent>;
  private llm: LLMClient;

  async route(input: string): Promise<string[]> {
    const classification = await this.llm.classify(input, {
      categories: this.config.categories,
      prompt: this.config.routingPrompt
    });

    return classification.categories;
  }

  async execute(input: string): Promise<string> {
    const categories = await this.route(input);
    
    // Execute relevant agents in parallel
    const results = await Promise.all(
      categories.map(cat => 
        this.agents.get(cat)!.execute(input)
      )
    );

    return this.synthesize(results);
  }

  private synthesize(results: string[]): string {
    // Combine and deduplicate results
    return results.join('\n\n');
  }
}
```

#### Pattern 5: Blackboard (Collaborative Refinement)

```
┌─────────────────────────────────────────────────┐
│              BLACKBOARD (Shared State)          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │Solution │  │Critique │  │Revision │  ...    │
│  │  Part   │  │  Notes  │  │  Draft  │         │
│  └─────────┘  └─────────┘  └─────────┘         │
└─────────────────────────────────────────────────┘
         ▲              ▲              ▲
         │              │              │
    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │Generator│   │ Critic  │   │Refiner  │
    │  Agent  │   │  Agent  │   │  Agent  │
    └─────────┘   └─────────┘   └─────────┘
```

**Characteristics:**
- Specialists contribute to shared workspace
- Iterative critique and refinement
- Accumulative problem-solving
- Best for: Creative tasks, complex problem-solving, quality-focused workflows

**Tradeoffs:**
- ✅ Quality improves through iteration
- ✅ Multiple perspectives
- ✅ Explicit critique process
- ❌ Higher latency (multiple rounds)
- ❌ Complex coordination

**Implementation:**
```typescript
interface BlackboardEntry {
  id: string;
  type: 'solution' | 'critique' | 'revision';
  content: string;
  author: string;
  timestamp: number;
}

class Blackboard {
  private entries: BlackboardEntry[] = [];
  private subscribers: Map<string, Agent[]> = new Map();

  addEntry(entry: BlackboardEntry) {
    this.entries.push(entry);
    this.notifySubscribers(entry.type);
  }

  getEntries(type?: string): BlackboardEntry[] {
    if (!type) return this.entries;
    return this.entries.filter(e => e.type === type);
  }

  getCurrentState(): string {
    return this.entries.map(e => e.content).join('\n\n');
  }
}

class BlackboardAgent {
  async contribute(blackboard: Blackboard): Promise<void> {
    const currentState = blackboard.getCurrentState();
    const contribution = await this.generate(currentState);
    
    blackboard.addEntry({
      id: crypto.randomUUID(),
      type: this.agentType,
      content: contribution,
      author: this.name,
      timestamp: Date.now()
    });
  }
}
```

#### Pattern 6: Hybrid (Production-Recommended)

```
┌─────────────────────────────────────────────────────┐
│              SUPERVISOR (Slow Thinker)              │
│         Planning, Aggregation, Quality Control      │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
    │ Fast A  │   │ Fast B  │   │ Fast C  │
    │Specialist│  │Specialist│  │Specialist│
    └─────────┘   └─────────┘   └─────────┘
    
    Periodic aggregation and quality checks
```

**Characteristics:**
- Fast specialist agents operate in parallel
- Slower supervisor periodically aggregates results
- Balances throughput with stability
- **Recommended for production systems**

**Tradeoffs:**
- ✅ Best of both worlds (speed + quality)
- ✅ Scalable architecture
- ✅ Quality control built-in
- ❌ Most complex to implement
- ❌ Requires careful tuning

---

### 2. Agent Role Matching

Select the right model architecture for each agent role:

| Model Type | Best For | Examples |
|------------|----------|----------|
| **Decoder (Generators)** | Writing, coding, producing solutions | GPT-4, Claude, Llama |
| **Encoder (Analysts)** | Semantic search, filtering, relevance | BERT, ModernBERT |
| **Mixture of Experts** | High capability, selective compute | Mixtral, Grok |
| **Reasoning Models** | Complex reasoning, reflection | o1, Claude Thinking |

**Key Principle:** Don't use prompts to force incompatible roles. Select architecture that fits the role.

---

### 3. Coordination Strategies

#### Sequential Chain
```typescript
const result = await agent1
  .execute(input)
  .then(r1 => agent2.execute(r1))
  .then(r2 => agent3.execute(r2));
```

#### Parallel Fan-Out
```typescript
const [result1, result2, result3] = await Promise.all([
  agent1.execute(input),
  agent2.execute(input),
  agent3.execute(input)
]);
```

#### Conditional Routing
```typescript
const category = await classifier.execute(input);
const agent = agents.get(category);
const result = await agent.execute(input);
```

#### Iterative Refinement
```typescript
let result = input;
for (let i = 0; i < maxIterations; i++) {
  const feedback = await critic.execute(result);
  if (feedback.approved) break;
  result = await refiner.execute(result, feedback);
}
```

---

### 4. State Management

```typescript
interface AgentState {
  // Conversation state
  conversationId: string;
  messages: Message[];
  
  // Task state
  currentTask: Task;
  completedTasks: Task[];
  pendingTasks: Task[];
  
  // Context
  variables: Record<string, any>;
  memory: VectorStore;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  ttl: number;
}

class StateManager {
  private states: Map<string, AgentState> = new Map();
  private persistence: StatePersistence;

  async getState(id: string): Promise<AgentState> {
    let state = this.states.get(id);
    if (!state) {
      state = await this.persistence.load(id);
      if (state) this.states.set(id, state);
    }
    return state!;
  }

  async updateState(id: string, update: Partial<AgentState>): Promise<void> {
    const state = await this.getState(id);
    Object.assign(state, update);
    state.updatedAt = Date.now();
    await this.persistence.save(state);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [id, state] of this.states.entries()) {
      if (now - state.updatedAt > state.ttl) {
        await this.persistence.save(state);
        this.states.delete(id);
      }
    }
  }
}
```

---

### 5. Exit Conditions & Loop Prevention

```typescript
interface ExecutionConfig {
  maxIterations: number;
  maxTokens: number;
  timeoutMs: number;
  stopConditions: StopCondition[];
}

interface StopCondition {
  name: string;
  check: (state: AgentState) => boolean;
  action: () => void;
}

class ExecutionGuard {
  private config: ExecutionConfig;
  private startTime: number;
  private iterationCount: number = 0;
  private tokenCount: number = 0;

  constructor(config: ExecutionConfig) {
    this.config = config;
    this.startTime = Date.now();
  }

  canContinue(state: AgentState): boolean {
    // Check iteration limit
    if (this.iterationCount >= this.config.maxIterations) {
      return false;
    }

    // Check timeout
    if (Date.now() - this.startTime > this.config.timeoutMs) {
      return false;
    }

    // Check token limit
    if (this.tokenCount >= this.config.maxTokens) {
      return false;
    }

    // Check custom stop conditions
    for (const condition of this.config.stopConditions) {
      if (condition.check(state)) {
        condition.action();
        return false;
      }
    }

    return true;
  }

  recordIteration(tokens: number) {
    this.iterationCount++;
    this.tokenCount += tokens;
  }
}

// Example stop conditions
const stopConditions: StopCondition[] = [
  {
    name: 'task_complete',
    check: (state) => state.currentTask?.status === 'completed',
    action: () => console.log('Task completed successfully')
  },
  {
    name: 'no_progress',
    check: (state) => {
      const lastChanges = state.messages.slice(-5);
      return lastChanges.every(m => m.content.length < 10);
    },
    action: () => console.warn('No progress detected, stopping')
  },
  {
    name: 'error_threshold',
    check: (state) => state.errorCount >= 3,
    action: () => console.error('Error threshold exceeded')
  }
];
```

---

## Best Practices

### 1. Start Simple, Scale When Needed

```typescript
// ❌ Don't: Start with complex multi-agent system
const system = new ComplexMultiAgentSystem({
  agents: 10,
  orchestration: 'hybrid',
  // ... over-engineered
});

// ✅ Do: Start with single agent + tools
const agent = new Agent({
  model: 'gpt-4',
  tools: [searchTool, codeTool, fileTool]
});

// Only add agents when hitting clear limits:
// - Context window overflow
// - Need for specialized knowledge
// - Parallel execution requirements
```

### 2. Design for Coordination Tax

Every agent adds:
- **Latency**: +200-2000ms per agent call
- **Cost**: +$0.001-0.10 per agent call
- **Complexity**: O(n²) communication paths

```typescript
// Calculate coordination overhead
function calculateOverhead(numAgents: number): {
  communicationPaths: number;
  estimatedLatency: number;
  estimatedCost: number;
} {
  return {
    communicationPaths: numAgents * (numAgents - 1) / 2,
    estimatedLatency: numAgents * 500, // ms
    estimatedCost: numAgents * 0.01 // USD
  };
}
```

### 3. Implement Proper Observability

```typescript
interface AgentMetrics {
  responseTime: Histogram;
  tokenUsage: Counter;
  errorRate: Gauge;
  taskCompletionRate: Gauge;
  coordinationOverhead: Histogram;
}

class AgentObservability {
  private metrics: AgentMetrics;
  private tracer: Tracer;

  async traceExecution(agent: string, task: string, fn: () => Promise<any>) {
    const span = this.tracer.startSpan('agent_execution', {
      agent,
      task
    });

    const startTime = Date.now();
    try {
      const result = await fn();
      this.metrics.responseTime.observe(Date.now() - startTime);
      return result;
    } catch (error) {
      this.metrics.errorRate.inc();
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}
```

### 4. Handle Failures Gracefully

```typescript
class ResilientAgent {
  private agent: Agent;
  private retryConfig: RetryConfig;
  private fallbackAgent?: Agent;

  async execute(input: string): Promise<string> {
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await this.agent.execute(input);
      } catch (error) {
        if (attempt === this.retryConfig.maxRetries) {
          if (this.fallbackAgent) {
            return await this.fallbackAgent.execute(input);
          }
          throw error;
        }
        await this.sleep(this.retryConfig.delayMs * Math.pow(2, attempt - 1));
      }
    }
    throw new Error('Unreachable');
  }
}
```

### 5. Manage Context Effectively

```typescript
class ContextManager {
  private maxContextLength: number;
  private compressionStrategy: 'truncate' | 'summarize' | 'sliding';

  async manageContext(messages: Message[], newMessage: Message): Promise<Message[]> {
    const updatedMessages = [...messages, newMessage];
    const totalTokens = this.countTokens(updatedMessages);

    if (totalTokens > this.maxContextLength) {
      switch (this.compressionStrategy) {
        case 'truncate':
          return this.truncateMessages(updatedMessages);
        case 'summarize':
          return await this.summarizeOldMessages(updatedMessages);
        case 'sliding':
          return this.slidingWindow(updatedMessages);
      }
    }

    return updatedMessages;
  }
}
```

---

## Anti-Patterns

### ❌ The Prompting Fallacy
Trying to fix systemic coordination failures with prompt tweaks.

```typescript
// ❌ Bad: Adding more instructions to fix coordination
const badPrompt = `
You are a super helpful agent.
Make sure to coordinate with other agents.
Don't forget to check with the supervisor.
Remember to update the state.
... (500 more words of instructions)
`;

// ✅ Good: Fix the architecture
class FixedOrchestrator {
  private explicitCoordination: CoordinationProtocol;
  
  async coordinate() {
    await this.explicitCoordination.notifyAll();
    await this.explicitCoordination.waitForAcknowledgments();
  }
}
```

### ❌ Unbounded Agent Count
Adding agents without measuring value.

```typescript
// ❌ Bad: Agent proliferation
const system = {
  agents: [
    'greeting', 'farewell', 'question', 'answer',
    'code', 'test', 'docs', 'review', 'refactor',
    'debug', 'deploy', 'monitor', 'alert', 'fix'
    // ... 50 more
  ]
};

// ✅ Good: Measured addition
class MeasuredSystem {
  async evaluateAgentValue(agent: string): Promise<number> {
    const before = await this.measurePerformance();
    this.removeAgent(agent);
    const after = await this.measurePerformance();
    return before.score - after.score; // Value contributed
  }
}
```

### ❌ Missing Exit Conditions
Allowing infinite loops.

```typescript
// ❌ Bad: No exit condition
while (!taskComplete) {
  result = await agent.process(result);
  // What if taskComplete never becomes true?
}

// ✅ Good: Multiple exit conditions
const guard = new ExecutionGuard({
  maxIterations: 10,
  timeoutMs: 30000,
  maxTokens: 50000,
  stopConditions: [
    { check: s => s.taskComplete, action: () => {} },
    { check: s => s.noProgress(3), action: () => log.warn('No progress') },
    { check: s => s.errorCount > 3, action: () => log.error('Too many errors') }
  ]
});

while (guard.canContinue(state)) {
  result = await agent.process(result);
  guard.recordIteration(countTokens(result));
}
```

---

## Tools & Libraries

| Tool | Purpose | Best For |
|------|---------|----------|
| **LangGraph** | Agent orchestration | Complex workflows, state machines |
| **AutoGen** | Multi-agent conversations | Research, experimentation |
| **CrewAI** | Role-based agents | Business workflows |
| **Semantic Kernel** | Enterprise agents | Microsoft ecosystem |
| **LlamaIndex** | RAG + agents | Knowledge-based agents |
| **Haystack** | Production agents | Enterprise search + agents |

---

## Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **Agent Response Time (p95)** | <2s | User experience |
| **Task Completion Rate** | >95% | System effectiveness |
| **Coordination Overhead** | <30% of total latency | Efficiency |
| **Token Usage per Task** | Track trend | Cost control |
| **Error Rate per Agent** | <1% | Reliability |
| **System Throughput** | Tasks/min | Scalability |
| **Context Window Utilization** | 60-80% | Efficiency |

---

## Implementation Checklist

### Architecture Design
- [ ] Defined clear agent roles and responsibilities
- [ ] Selected appropriate architecture pattern
- [ ] Designed communication protocols
- [ ] Planned for coordination overhead
- [ ] Created state management strategy

### Implementation
- [ ] Implemented base agent class
- [ ] Created specialist agents
- [ ] Built orchestrator/supervisor
- [ ] Implemented message routing
- [ ] Added retry and fallback logic

### Quality & Safety
- [ ] Implemented exit conditions
- [ ] Added loop prevention
- [ ] Created timeout handling
- [ ] Built error recovery
- [ ] Added observability (metrics, tracing)

### Testing
- [ ] Individual agent unit tests
- [ ] Agent interaction tests
- [ ] System-level orchestration tests
- [ ] Load and stress tests
- [ ] Failure scenario tests

### Production Readiness
- [ ] Monitoring dashboards
- [ ] Alerting configured
- [ ] Runbooks documented
- [ ] Cost tracking enabled
- [ ] Performance baselines established

---

## Related Skills

- **AI/LLM Integration**: `skills/stack/ai-llm-integration/ai_llm_integration_skill_v1/SKILL.md`
- **RAG Systems**: `skills/ai/rag-systems/rag_systems_v1/SKILL.md`
- **Event-Driven Architecture**: `skills/architecture/event-driven/event_driven_v1/SKILL.md`
- **Microservices**: `skills/architecture/microservices/microservices_v1/SKILL.md`
- **MLOps**: `skills/ai/mlops/mlops_v1/SKILL.md`

---

**Version:** 1.0.0
**Last Updated:** March 29, 2026
**Status:** ✅ Complete
