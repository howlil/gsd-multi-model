/**
 * TestDataBuilder - Fluent builders for test data construction
 *
 * Provides a fluent API for building complex test objects with sensible defaults.
 * Use builder pattern to create test data with clear, readable syntax.
 *
 * @example
 * ```typescript
 * // Build an agent with fluent API
 * const agent = new AgentBuilder()
 *   .withId('agent-123')
 *   .withName('Test Agent')
 *   .withModel('claude-3-sonnet')
 *   .withSkill('research')
 *   .withSkill('analysis')
 *   .build();
 *
 * // Build with minimal overrides
 * const phase = new PhaseBuilder()
 *   .withStatus('in-progress')
 *   .build();
 * ```
 */

// Type definitions for domain objects
interface Agent {
  id: string;
  name: string;
  model: string;
  role: string;
  skills: string[];
  status: string;
}

interface Phase {
  id: string;
  name: string;
  status: string;
  description: string;
  tasks: any[];
  wave: number;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  handler: string;
  triggers: string[];
  priority: number;
}

interface Session {
  id: string;
  agentId: string;
  status: string;
  messages: any[];
  createdAt: Date;
}

/**
 * Builder for Agent test objects
 */
export class AgentBuilder {
  private data: Partial<Agent> = {
    id: 'agent-1',
    name: 'Test Agent',
    model: 'claude-3-sonnet',
    role: 'assistant',
    skills: [],
    status: 'active'
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withModel(model: string): this {
    this.data.model = model;
    return this;
  }

  withRole(role: string): this {
    this.data.role = role;
    return this;
  }

  withSkill(skill: string): this {
    if (!this.data.skills) {
      this.data.skills = [];
    }
    this.data.skills.push(skill);
    return this;
  }

  withSkills(skills: string[]): this {
    this.data.skills = skills;
    return this;
  }

  withStatus(status: string): this {
    this.data.status = status;
    return this;
  }

  withOverrides(overrides: Partial<Agent>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  build(): Agent {
    return this.data as Agent;
  }
}

/**
 * Builder for Phase test objects
 */
export class PhaseBuilder {
  private data: Partial<Phase> = {
    id: 'phase-1',
    name: 'Test Phase',
    status: 'pending',
    description: 'Test phase description',
    tasks: [],
    wave: 1
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withStatus(status: string): this {
    this.data.status = status;
    return this;
  }

  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  withTask(task: any): this {
    if (!this.data.tasks) {
      this.data.tasks = [];
    }
    this.data.tasks.push(task);
    return this;
  }

  withTasks(tasks: any[]): this {
    this.data.tasks = tasks;
    return this;
  }

  withWave(wave: number): this {
    this.data.wave = wave;
    return this;
  }

  withOverrides(overrides: Partial<Phase>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  build(): Phase {
    return this.data as Phase;
  }
}

/**
 * Builder for Skill test objects
 */
export class SkillBuilder {
  private data: Partial<Skill> = {
    id: 'skill-1',
    name: 'Test Skill',
    description: 'Test skill description',
    handler: 'test-handler',
    triggers: ['test'],
    priority: 1
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  withHandler(handler: string): this {
    this.data.handler = handler;
    return this;
  }

  withTrigger(trigger: string): this {
    if (!this.data.triggers) {
      this.data.triggers = [];
    }
    this.data.triggers.push(trigger);
    return this;
  }

  withTriggers(triggers: string[]): this {
    this.data.triggers = triggers;
    return this;
  }

  withPriority(priority: number): this {
    this.data.priority = priority;
    return this;
  }

  withOverrides(overrides: Partial<Skill>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  build(): Skill {
    return this.data as Skill;
  }
}

/**
 * Builder for Session test objects
 */
export class SessionBuilder {
  private data: Partial<Session> = {
    id: 'session-1',
    agentId: 'agent-1',
    status: 'active',
    messages: [],
    createdAt: new Date()
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withAgent(agentId: string): this {
    this.data.agentId = agentId;
    return this;
  }

  withStatus(status: string): this {
    this.data.status = status;
    return this;
  }

  withMessage(message: any): this {
    if (!this.data.messages) {
      this.data.messages = [];
    }
    this.data.messages.push(message);
    return this;
  }

  withMessages(messages: any[]): this {
    this.data.messages = messages;
    return this;
  }

  withCreatedAt(date: Date): this {
    this.data.createdAt = date;
    return this;
  }

  withOverrides(overrides: Partial<Session>): this {
    this.data = { ...this.data, ...overrides };
    return this;
  }

  build(): Session {
    return this.data as Session;
  }
}
