#!/usr/bin/env node

/**
 * EZ Model Provider — Unified API for multiple AI providers
 * 
 * Supports: Anthropic, Moonshot (Kimi), Alibaba (Qwen), OpenAI
 */

const https = require('https');
const { URL } = require('url');
const Logger = require('./logger.cjs');
const logger = new Logger();

class ModelProvider {
  /**
   * Create model provider
   * @param {Object} config - Configuration
   */
  constructor(config) {
    this.provider = config.provider || 'anthropic';
    this.model = config.model || 'sonnet';
    this.apiKey = config.apiKey || process.env[`${this.provider.toUpperCase()}_API_KEY`];
    
    if (!this.apiKey && this.provider !== 'anthropic') {
      logger.warn('API key not configured', { provider: this.provider });
    }
  }

  /**
   * Helper for HTTP requests
   */
  _httpRequest(options, data) {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              resolve(body);
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      });
      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  /**
   * Send chat message
   * @param {Object[]} messages - Chat messages
   * @param {Object} options - Chat options
   * @returns {Promise<Object>} - Response
   */
  async chat(messages, options = {}) {
    logger.info('Chat request', { 
      provider: this.provider, 
      model: this.model,
      messageCount: messages.length 
    });

    switch (this.provider) {
      case 'anthropic':
        return this._chatAnthropic(messages, options);
      case 'moonshot':
        return this._chatMoonshot(messages, options);
      case 'alibaba':
      case 'qwen':
        return this._chatQwen(messages, options);
      case 'openai':
        return this._chatOpenAI(messages, options);
      default:
        throw new Error(`Unsupported provider: ${this.provider}`);
    }
  }

  /**
   * Anthropic Claude API
   */
  async _chatAnthropic(messages, options) {
    // Anthropic usually requires their SDK or complex headers
    logger.debug('Anthropic chat', { model: this.model });
    return {
      content: '[Anthropic response placeholder - requires SDK]',
      provider: 'anthropic',
      model: this.model
    };
  }

  /**
   * Moonshot (Kimi) API
   */
  async _chatMoonshot(messages, options) {
    const modelName = this.model === 'sonnet' ? 'moonshot-v1-8k' : this.model;
    const data = {
      model: modelName,
      messages: messages,
      temperature: options.temperature || 0.3
    };

    const reqOptions = {
      hostname: 'api.moonshot.cn',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };

    try {
      const response = await this._httpRequest(reqOptions, data);
      return {
        content: response.choices[0].message.content,
        provider: 'moonshot',
        model: modelName
      };
    } catch (error) {
      logger.error('Moonshot API error', { error: error.message });
      throw error;
    }
  }

  /**
   * Alibaba Qwen API (DashScope)
   */
  async _chatQwen(messages, options) {
    // Map generic model names to Qwen specific ones
    let modelName = this.model;
    if (modelName === 'sonnet' || modelName === 'gpt-4') modelName = 'qwen-max';
    if (modelName === 'haiku' || modelName === 'gpt-3.5-turbo') modelName = 'qwen-plus';

    const data = {
      model: modelName,
      input: {
        messages: messages
      },
      parameters: {
        result_format: 'message',
        temperature: options.temperature || 0.3
      }
    };

    const reqOptions = {
      hostname: 'dashscope.aliyuncs.com',
      path: '/api/v1/services/aigc/text-generation/generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };

    try {
      const response = await this._httpRequest(reqOptions, data);
      return {
        content: response.output.choices[0].message.content,
        provider: 'alibaba',
        model: modelName
      };
    } catch (error) {
      logger.error('Qwen API error', { error: error.message });
      throw error;
    }
  }

  /**
   * OpenAI API
   */
  async _chatOpenAI(messages, options) {
    const modelName = this.model === 'sonnet' ? 'gpt-4-turbo' : this.model;
    const data = {
      model: modelName,
      messages: messages,
      temperature: options.temperature || 0.3
    };

    const reqOptions = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };

    try {
      const response = await this._httpRequest(reqOptions, data);
      return {
        content: response.choices[0].message.content,
        provider: 'openai',
        model: modelName
      };
    } catch (error) {
      logger.error('OpenAI API error', { error: error.message });
      throw error;
    }
  }

  /**
   * Count tokens (approximate)
   * @param {string} text - Text to count
   * @returns {number} - Approximate token count
   */
  countTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get provider info
   * @returns {Object} - Provider information
   */
  getInfo() {
    return {
      provider: this.provider,
      model: this.model,
      hasApiKey: !!this.apiKey
    };
  }
}

/**
 * Create provider from config
 * @param {Object} config - Provider config
 * @returns {ModelProvider} - Model provider instance
 */
function createProvider(config) {
  return new ModelProvider(config);
}

module.exports = {
  ModelProvider,
  createProvider
};
