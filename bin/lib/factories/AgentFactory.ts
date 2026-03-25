/**
 * AgentFactoryRegistry
 *
 * Singleton registry for agent factories implementing the Factory pattern.
 * Enables runtime extensibility and decouples agent consumers from concrete implementations.
 *
 * @example
 * ```typescript
 * const registry = AgentFactoryRegistry.getInstance();
 * registry.registerAgent('ez-planner', (config) => new EzPlannerAgent(config));
 * const agent = registry.createAgent('ez-planner', { name: 'ez-planner' });
 * ```
 */

import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { IAgent, AgentConfig, AgentFactory } from './types.js';

/**
 * AgentFactoryRegistry class
 * Singleton registry for managing agent factories and creating agent instances.
 */
export class AgentFactoryRegistry {
  /** Singleton instance */
  private static instance: AgentFactoryRegistry | null = null;

  /** Map of registered agent factories */
  private factories: Map<string, AgentFactory>;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.factories = new Map<string, AgentFactory>();
  }

  /**
   * Get the singleton instance of AgentFactoryRegistry
   * @returns The singleton instance
   */
  @LogExecution('AgentFactoryRegistry.getInstance', { logDuration: true })
  public static getInstance(): AgentFactoryRegistry {
    if (!AgentFactoryRegistry.instance) {
      AgentFactoryRegistry.instance = new AgentFactoryRegistry();
    }
    return AgentFactoryRegistry.instance;
  }

  /**
   * Register an agent factory with the registry
   * @param type - The agent type identifier
   * @param factory - The factory function to create agent instances
   */
  @LogExecution('AgentFactoryRegistry.registerAgent', { logParams: true, logDuration: true })
  public registerAgent(type: string, factory: AgentFactory): void {
    if (this.factories.has(type)) {
      logger.warn(`Agent type '${type}' is already registered. Overwriting.`);
    }
    this.factories.set(type, factory);
    logger.info(`Agent type '${type}' registered successfully.`);
  }

  /**
   * Create an agent instance using the registered factory
   * @param type - The agent type identifier
   * @param config - The agent configuration
   * @returns The created agent instance
   * @throws Error if the agent type is not registered
   */
  @LogExecution('AgentFactoryRegistry.createAgent', { logParams: true, logDuration: true })
  public createAgent(type: string, config: AgentConfig): IAgent {
    const factory = this.factories.get(type);
    if (!factory) {
      const availableTypes = this.getRegisteredTypes().join(', ');
      throw new Error(
        `Agent type '${type}' is not registered. Available types: ${availableTypes}`
      );
    }

    logger.info(`Creating agent instance of type '${type}'`);
    return factory(config);
  }

  /**
   * Check if an agent type is registered
   * @param type - The agent type identifier
   * @returns True if the agent type is registered
   */
  @LogExecution('AgentFactoryRegistry.hasAgent', { logDuration: true })
  public hasAgent(type: string): boolean {
    return this.factories.has(type);
  }

  /**
   * Get a list of all registered agent types
   * @returns Array of registered agent type identifiers
   */
  @LogExecution('AgentFactoryRegistry.getRegisteredTypes', { logDuration: true, logResult: true })
  public getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Unregister an agent factory from the registry
   * @param type - The agent type identifier to remove
   * @throws Error if the agent type is not registered
   */
  @LogExecution('AgentFactoryRegistry.unregisterAgent', { logParams: true, logDuration: true })
  public unregisterAgent(type: string): void {
    if (!this.factories.has(type)) {
      throw new Error(`Agent type '${type}' is not registered.`);
    }
    this.factories.delete(type);
    logger.info(`Agent type '${type}' unregistered successfully.`);
  }

  /**
   * Clear all registered agent factories
   * Useful for testing or resetting the registry state.
   */
  @LogExecution('AgentFactoryRegistry.clear', { logDuration: true })
  public clear(): void {
    const count = this.factories.size;
    this.factories.clear();
    logger.info(`Cleared ${count} registered agent types.`);
  }
}
