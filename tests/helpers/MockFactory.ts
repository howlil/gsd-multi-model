/**
 * MockFactory - Standardized mock object creation for tests
 *
 * Provides factory methods for creating mock domain objects with sensible defaults.
 * Use this to avoid inline mock creation and ensure consistent test data.
 *
 * @example
 * ```typescript
 * // Create a mock agent with default values
 * const agent = MockFactory.createAgent();
 *
 * // Create a mock agent with custom values
 * const agent = MockFactory.createAgent({ id: 'custom-id', name: 'Custom Agent' });
 *
 * // Create a mock of any type
 * const mock = MockFactory.createMock(MyClass, { prop: 'value' });
 * ```
 */

// Type definitions for domain objects
interface Agent {
  id: string;
  name: string;
  model?: string;
  role?: string;
  skills?: string[];
  status?: string;
}

interface Phase {
  id: string;
  name: string;
  status?: string;
  description?: string;
  tasks?: any[];
  wave?: number;
}

interface Skill {
  id: string;
  name: string;
  description?: string;
  handler?: string;
  triggers?: string[];
  priority?: number;
}

interface Session {
  id: string;
  agentId?: string;
  status?: string;
  messages?: any[];
  createdAt?: Date;
}

export class MockFactory {
  /**
   * Default values for mock objects
   */
  private static readonly DEFAULTS = {
    AGENT: {
      id: 'test-agent-1',
      name: 'Test Agent',
      model: 'claude-3-sonnet',
      role: 'assistant',
      skills: [],
      status: 'active'
    },
    PHASE: {
      id: 'test-phase-1',
      name: 'Test Phase',
      status: 'pending',
      description: 'Test phase description',
      tasks: [],
      wave: 1
    },
    SKILL: {
      id: 'test-skill-1',
      name: 'Test Skill',
      description: 'Test skill description',
      handler: 'test-handler',
      triggers: ['test'],
      priority: 1
    },
    SESSION: {
      id: 'test-session-1',
      agentId: 'test-agent-1',
      status: 'active',
      messages: [],
      createdAt: new Date()
    }
  };

  /**
   * Create a mock Agent object
   * @param overrides - Properties to override defaults
   * @returns A mock Agent object
   */
  static createAgent(overrides?: Partial<Agent>): Agent {
    return { ...this.DEFAULTS.AGENT, ...overrides };
  }

  /**
   * Create a mock Phase object
   * @param overrides - Properties to override defaults
   * @returns A mock Phase object
   */
  static createPhase(overrides?: Partial<Phase>): Phase {
    return { ...this.DEFAULTS.PHASE, ...overrides };
  }

  /**
   * Create a mock Skill object
   * @param overrides - Properties to override defaults
   * @returns A mock Skill object
   */
  static createSkill(overrides?: Partial<Skill>): Skill {
    return { ...this.DEFAULTS.SKILL, ...overrides };
  }

  /**
   * Create a mock Session object
   * @param overrides - Properties to override defaults
   * @returns A mock Session object
   */
  static createSession(overrides?: Partial<Session>): Session {
    return { ...this.DEFAULTS.SESSION, ...overrides };
  }

  /**
   * Create a mock object of any type
   * @param type - The constructor of the type to mock
   * @param overrides - Properties to override
   * @returns A mock object of type T
   */
  static createMock<T extends object>(type: new (...args: any[]) => T, overrides?: Partial<T>): T {
    const mock: Partial<T> = { ...overrides };
    return mock as T;
  }

  /**
   * Create an array of mock objects
   * @param factory - Factory function to create individual items
   * @param count - Number of items to create
   * @param baseOverrides - Base overrides applied to all items
   * @returns Array of mock objects
   */
  static createMany<T>(
    factory: (index: number) => T,
    count: number,
    baseOverrides?: Partial<T>
  ): T[] {
    return Array.from({ length: count }, (_, i) => ({
      ...factory(i),
      ...baseOverrides
    }));
  }

  /**
   * Create a mock function (jest/vitest compatible)
   * @param implementation - Optional implementation
   * @returns A mock function
   */
  static createFn<T extends (...args: any[]) => any>(implementation?: T): jest.MockedFunction<T> | T {
    if (implementation) {
      return implementation;
    }
    // Return a no-op function as fallback
    return (() => {}) as unknown as T;
  }
}
