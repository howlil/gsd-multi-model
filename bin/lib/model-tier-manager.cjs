#!/usr/bin/env node

/**
 * EZ Model Tier Manager — Budget-aware model selection with tier downgrade
 *
 * Manages model tiers (premium, standard, economy) and selects models based on budget pressure
 * Supports multiple providers: claude, openai, qwen, kimi
 *
 * Usage:
 *   const ModelTierManager = require('./model-tier-manager.cjs');
 *   const manager = new ModelTierManager('claude');
 *   const model = manager.selectModel('planning', 85); // 85% budget used
 */

const fs = require('fs');
const path = require('path');
const Logger = require('./logger.cjs');
const logger = new Logger();

/**
 * Model tiers by provider
 */
const MODEL_TIERS = {
  claude: {
    premium: ['claude-3-opus', 'claude-sonnet-4-6'],
    standard: ['claude-3-sonnet'],
    economy: ['claude-3-haiku']
  },
  openai: {
    premium: ['gpt-4', 'gpt-4-turbo'],
    standard: ['gpt-3.5-turbo'],
    economy: ['gpt-3.5-turbo']
  },
  qwen: {
    premium: ['qwen-max'],
    standard: ['qwen-plus'],
    economy: ['qwen-turbo']
  },
  kimi: {
    premium: ['kimi-v1-32k'],
    standard: ['kimi-v1-8k'],
    economy: ['kimi-v1-8k']
  }
};

/**
 * Default task type to tier mapping
 */
const DEFAULT_TASK_TIERS = {
  planning: 'premium',
  execution: 'standard',
  verification: 'standard'
};

class ModelTierManager {
  /**
   * Create ModelTierManager instance
   * @param {string} [provider] - Provider name (claude, openai, qwen, kimi)
   * @param {string} [cwd] - Working directory (defaults to process.cwd())
   */
  constructor(provider, cwd) {
    this.provider = provider || 'claude';
    this.cwd = cwd || process.cwd();
    this.metricsPath = path.join(this.cwd, '.planning', 'metrics.json');
  }

  /**
   * Get model tier based on budget percentage used
   * @param {number} budgetPercentUsed - Budget usage percentage (0-100)
   * @returns {string} - Tier name: 'premium', 'standard', or 'economy'
   */
  getTierForBudget(budgetPercentUsed) {
    if (budgetPercentUsed >= 90) return 'economy';
    if (budgetPercentUsed >= 75) return 'standard';
    return 'premium';
  }

  /**
   * Select model based on task type and budget pressure
   * @param {string} taskType - Task type (planning, execution, verification)
   * @param {number} budgetPercentUsed - Budget usage percentage (0-100)
   * @returns {string} - Selected model name
   */
  selectModel(taskType, budgetPercentUsed) {
    const providerTiers = MODEL_TIERS[this.provider] || MODEL_TIERS.claude;
    const tier = this.getTierForBudget(budgetPercentUsed);
    const models = providerTiers[tier] || providerTiers.economy;

    return models[0] || models[models.length - 1] || 'claude-3-haiku';
  }

  /**
   * Get tier for a given model name
   * @param {string} modelName - Model name to check
   * @returns {string|null} - Tier name or null if not found
   */
  getTierForModel(modelName) {
    const providerTiers = MODEL_TIERS[this.provider] || MODEL_TIERS.claude;

    for (const [tier, models] of Object.entries(providerTiers)) {
      if (models.includes(modelName)) {
        return tier;
      }
    }

    return null;
  }

  /**
   * Get all models for a specific tier
   * @param {string} tier - Tier name (premium, standard, economy)
   * @returns {string[]} - Array of model names
   */
  getModelsForTier(tier) {
    const providerTiers = MODEL_TIERS[this.provider] || MODEL_TIERS.claude;
    return providerTiers[tier] || [];
  }

  /**
   * Log model downgrade event
   * @param {string} fromModel - Original model
   * @param {string} toModel - Downgraded model
   * @param {string} reason - Reason for downgrade
   * @returns {Promise<void>}
   */
  async logDowngrade(fromModel, toModel, reason) {
    const event = {
      event: 'model_downgrade',
      timestamp: new Date().toISOString(),
      provider: this.provider,
      fromModel,
      toModel,
      reason,
      budgetPercentUsed: this._getLastBudgetPercent()
    };

    logger.warn('model-tier-manager: model downgrade', event);

    // Log to metrics.json
    try {
      let metrics = { downgrades: [] };
      if (fs.existsSync(this.metricsPath)) {
        try {
          metrics = JSON.parse(fs.readFileSync(this.metricsPath, 'utf8'));
          if (!Array.isArray(metrics.downgrades)) metrics.downgrades = [];
        } catch (e) {
          metrics = { downgrades: [] };
        }
      }

      metrics.downgrades.push(event);
      fs.writeFileSync(this.metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
    } catch (err) {
      logger.error('model-tier-manager: failed to log downgrade', { error: err.message });
    }
  }

  /**
   * Get last budget percentage (helper for logging)
   * @private
   * @returns {number} - Last budget percentage or 0
   */
  _getLastBudgetPercent() {
    try {
      if (!fs.existsSync(this.metricsPath)) return 0;
      const metrics = JSON.parse(fs.readFileSync(this.metricsPath, 'utf8'));
      return metrics.lastBudgetPercent || 0;
    } catch (e) {
      return 0;
    }
  }

  /**
   * Set last budget percentage (for external tracking)
   * @param {number} percent - Budget percentage
   */
  setLastBudgetPercent(percent) {
    try {
      let metrics = {};
      if (fs.existsSync(this.metricsPath)) {
        try {
          metrics = JSON.parse(fs.readFileSync(this.metricsPath, 'utf8'));
        } catch (e) {
          metrics = {};
        }
      }

      metrics.lastBudgetPercent = percent;
      fs.writeFileSync(this.metricsPath, JSON.stringify(metrics, null, 2), 'utf8');
    } catch (err) {
      logger.error('model-tier-manager: failed to set budget percent', { error: err.message });
    }
  }

  /**
   * Get available providers
   * @returns {string[]} - Array of provider names
   */
  static getAvailableProviders() {
    return Object.keys(MODEL_TIERS);
  }

  /**
   * Get all model tiers
   * @returns {Object} - Model tiers object
   */
  static getModelTiers() {
    return MODEL_TIERS;
  }
}

module.exports = ModelTierManager;
module.exports.MODEL_TIERS = MODEL_TIERS;
module.exports.DEFAULT_TASK_TIERS = DEFAULT_TASK_TIERS;
