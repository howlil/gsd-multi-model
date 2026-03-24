#!/usr/bin/env node

/**
 * EZ Assistant Adapters — Unified interface for AI coding assistants
 * 
 * Adapters for: Claude Code, OpenCode, Gemini CLI, Codex
 * 
 * Usage:
 *   const { createAdapter } = require('./assistant-adapter.cjs');
 *   const adapter = createAdapter('claude-code');
 *   await adapter.spawnAgent('planner', { prompt: '...' });
 */

const Logger = require('./logger.cjs');
const logger = new Logger();
const CircuitBreaker = require('./circuit-breaker.cjs');
const ModelTierManager = require('./model-tier-manager.cjs');
const CostTracker = require('./cost-tracker.cjs');

/**
 * Base adapter interface
 */
class AssistantAdapter {
  constructor(name) {
    if (new.target === AssistantAdapter) {
      throw new Error('AssistantAdapter is abstract - use a concrete subclass');
    }
    this.name = name;
  }

  /**
   * Spawn a subagent
   * @param {string} type - Agent type
   * @param {Object} options - Agent options
   * @returns {Promise<Object>} - Agent result
   */
  async spawnAgent(type, options) {
    throw new Error('spawnAgent must be implemented');
  }

  /**
   * Call a tool/function
   * @param {string} tool - Tool name
   * @param {Object} params - Tool parameters
   * @returns {Promise<any>} - Tool result
   */
  async callTool(tool, params) {
    throw new Error('callTool must be implemented');
  }

  /**
   * Select model for task
   * @param {string} taskType - Task type (planning, execution, verification)
   * @returns {string} - Model name
   */
  selectModel(taskType) {
    throw new Error('selectModel must be implemented');
  }

  /**
   * Get adapter info
   * @returns {Object} - Adapter information
   */
  getInfo() {
    return {
      name: this.name,
      type: this.constructor.name
    };
  }
}

/**
 * Claude Code adapter
 */
class ClaudeCodeAdapter extends AssistantAdapter {
  constructor() {
    super('claude-code');
  }

  async spawnAgent(type, options) {
    logger.info('Claude Code: spawning agent', { type });
    // Would use Claude Code's Task tool in production
    return { type, status: 'completed', result: '[Claude Code agent result]' };
  }

  async callTool(tool, params) {
    logger.info('Claude Code: calling tool', { tool });
    // Would use Claude Code's tool system
    return { tool, status: 'success' };
  }

  selectModel(taskType) {
    const models = {
      planning: 'claude-3-opus',
      execution: 'claude-3-sonnet',
      verification: 'claude-3-sonnet'
    };
    return models[taskType] || models.execution;
  }
}

/**
 * OpenCode adapter
 */
class OpenCodeAdapter extends AssistantAdapter {
  constructor() {
    super('opencode');
  }

  async spawnAgent(type, options) {
    logger.info('OpenCode: spawning agent', { type });
    return { type, status: 'completed', result: '[OpenCode agent result]' };
  }

  async callTool(tool, params) {
    logger.info('OpenCode: calling tool', { tool });
    return { tool, status: 'success' };
  }

  selectModel(taskType) {
    return 'gpt-4-turbo';
  }
}

/**
 * Gemini CLI adapter
 */
class GeminiAdapter extends AssistantAdapter {
  constructor() {
    super('gemini');
  }

  async spawnAgent(type, options) {
    logger.info('Gemini: spawning agent', { type });
    return { type, status: 'completed', result: '[Gemini agent result]' };
  }

  async callTool(tool, params) {
    logger.info('Gemini: calling tool', { tool });
    return { tool, status: 'success' };
  }

  selectModel(taskType) {
    return 'gemini-pro';
  }
}

/**
 * Codex adapter
 */
class CodexAdapter extends AssistantAdapter {
  constructor() {
    super('codex');
  }

  async spawnAgent(type, options) {
    logger.info('Codex: spawning agent', { type });
    return { type, status: 'completed', result: '[Codex agent result]' };
  }

  async callTool(tool, params) {
    logger.info('Codex: calling tool', { tool });
    return { tool, status: 'success' };
  }

  selectModel(taskType) {
    return 'codex-latest';
  }
}

/**
 * Qwen Code adapter
 */
class QwenAdapter extends AssistantAdapter {
  constructor() {
    super('qwen');
  }

  async spawnAgent(type, options) {
    logger.info('Qwen Code: spawning agent', { type });
    // Qwen Code uses its own agent system
    return { type, status: 'completed', result: '[Qwen Code agent result]' };
  }

  async callTool(tool, params) {
    logger.info('Qwen Code: calling tool', { tool });
    return { tool, status: 'success' };
  }

  selectModel(taskType) {
    const models = {
      planning: 'qwen-max',
      execution: 'qwen-plus',
      verification: 'qwen-plus'
    };
    return models[taskType] || models.execution;
  }
}

/**
 * Kimi Code adapter
 */
class KimiAdapter extends AssistantAdapter {
  constructor() {
    super('kimi');
  }

  async spawnAgent(type, options) {
    logger.info('Kimi Code: spawning agent', { type });
    return { type, status: 'completed', result: '[Kimi Code agent result]' };
  }

  async callTool(tool, params) {
    logger.info('Kimi Code: calling tool', { tool });
    return { tool, status: 'success' };
  }

  selectModel(taskType) {
    const models = {
      planning: 'moonshot-v1-32k',
      execution: 'moonshot-v1-8k',
      verification: 'moonshot-v1-8k'
    };
    return models[taskType] || models.execution;
  }
}

/**
 * Circuit Breaker Adapter Wrapper — Wraps any adapter with circuit breaker protection
 */
class CircuitBreakerAdapter extends AssistantAdapter {
  /**
   * Create circuit breaker wrapped adapter
   * @param {AssistantAdapter} delegate - The actual adapter to wrap
   * @param {CircuitBreaker} breaker - Circuit breaker instance
   */
  constructor(delegate, breaker) {
    super(delegate.name);
    this.delegate = delegate;
    this.breaker = breaker;
  }

  /**
   * Spawn agent with circuit breaker protection
   * @param {string} type - Agent type
   * @param {Object} options - Agent options
   * @returns {Promise<Object>} - Agent result
   */
  async spawnAgent(type, options) {
    return this.breaker.execute(() => this.delegate.spawnAgent(type, options));
  }

  /**
   * Call tool with circuit breaker protection
   * @param {string} tool - Tool name
   * @param {Object} params - Tool parameters
   * @returns {Promise<any>} - Tool result
   */
  async callTool(tool, params) {
    return this.breaker.execute(() => this.delegate.callTool(tool, params));
  }

  /**
   * Select model with budget-aware downgrade
   * @param {string} taskType - Task type
   * @returns {string} - Selected model
   */
  selectModel(taskType) {
    const costTracker = new CostTracker();
    const budgetStatus = costTracker.checkBudget();
    const percentUsed = budgetStatus.percentUsed || 0;

    const modelManager = new ModelTierManager('claude');
    const model = modelManager.selectModel(taskType, percentUsed);

    // Log downgrade if not using premium model
    if (percentUsed >= 75) {
      const originalModel = this.delegate.selectModel(taskType);
      if (originalModel !== model) {
        modelManager.logDowngrade(originalModel, model, `budget pressure: ${percentUsed.toFixed(1)}%`);
      }
    }

    return model;
  }

  /**
   * Get adapter info
   * @returns {Object} - Adapter information
   */
  getInfo() {
    return {
      ...this.delegate.getInfo(),
      circuitBreaker: {
        enabled: true,
        state: this.breaker.getState()
      }
    };
  }
}

/**
 * Factory function to create adapter
 * @param {string} type - Adapter type
 * @param {Object} [options] - Adapter options
 * @param {boolean} [options.circuitBreaker=true] - Enable circuit breaker
 * @param {string} [options.cwd] - Working directory
 * @returns {AssistantAdapter} - Adapter instance
 */
function createAdapter(type, options = {}) {
  const adapters = {
    'claude-code': ClaudeCodeAdapter,
    'opencode': OpenCodeAdapter,
    'gemini': GeminiAdapter,
    'codex': CodexAdapter,
    'qwen': QwenAdapter,
    'kimi': KimiAdapter
  };

  const AdapterClass = adapters[type];
  if (!AdapterClass) {
    throw new Error(`Unknown adapter type: ${type}. Available: ${Object.keys(adapters).join(', ')}`);
  }

  const delegate = new AdapterClass();

  // Wrap with circuit breaker if enabled
  if (options.circuitBreaker !== false) {
    const breaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
      persistState: true,
      cwd: options.cwd,
      agentType: type
    });
    return new CircuitBreakerAdapter(delegate, breaker);
  }

  return delegate;
}

/**
 * Get available adapters
 * @returns {string[]} - List of adapter names
 */
function getAvailableAdapters() {
  return ['claude-code', 'opencode', 'gemini', 'codex', 'qwen', 'kimi'];
}

module.exports = {
  AssistantAdapter,
  ClaudeCodeAdapter,
  OpenCodeAdapter,
  GeminiAdapter,
  CodexAdapter,
  QwenAdapter,
  KimiAdapter,
  CircuitBreakerAdapter,
  createAdapter,
  getAvailableAdapters
};
