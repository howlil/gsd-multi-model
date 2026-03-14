#!/usr/bin/env node

/**
 * GSD Assistant Adapters — Unified interface for AI coding assistants
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
 * Factory function to create adapter
 * @param {string} type - Adapter type
 * @returns {AssistantAdapter} - Adapter instance
 */
function createAdapter(type) {
  const adapters = {
    'claude-code': ClaudeCodeAdapter,
    'opencode': OpenCodeAdapter,
    'gemini': GeminiAdapter,
    'codex': CodexAdapter
  };

  const AdapterClass = adapters[type];
  if (!AdapterClass) {
    throw new Error(`Unknown adapter type: ${type}. Available: ${Object.keys(adapters).join(', ')}`);
  }

  return new AdapterClass();
}

/**
 * Get available adapters
 * @returns {string[]} - List of adapter names
 */
function getAvailableAdapters() {
  return ['claude-code', 'opencode', 'gemini', 'codex'];
}

module.exports = {
  AssistantAdapter,
  ClaudeCodeAdapter,
  OpenCodeAdapter,
  GeminiAdapter,
  CodexAdapter,
  createAdapter,
  getAvailableAdapters
};
