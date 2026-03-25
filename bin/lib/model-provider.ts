#!/usr/bin/env node

/**
 * EZ Model Provider — Unified API for multiple AI providers
 *
 * Supports: Anthropic, Moonshot (Kimi), Alibaba (Qwen), OpenAI
 */

import * as https from 'https';
import { URL } from 'url';
import Logger, { defaultLogger as logger } from './logger.js';

interface ProviderConfig {
  provider?: string;
  model?: string;
  apiKey?: string;
}

interface ChatOptions {
  temperature?: number;
  [key: string]: unknown;
}

interface ChatResponse {
  content: string;
  provider: string;
  model: string;
}

interface Message {
  role: string;
  content: string;
}

interface HttpRequestOptions {
  hostname: string;
  path: string;
  method: string;
  headers: Record<string, string>;
}

class ModelProvider {
  private provider: string;
  private model: string;
  private apiKey: string;

  /**
   * Create model provider
   * @param config - Configuration
   */
  constructor(config: ProviderConfig) {
    this.provider = config.provider || 'anthropic';
    this.model = config.model || 'sonnet';
    this.apiKey = config.apiKey || process.env[`${this.provider.toUpperCase()}_API_KEY`] || '';

    if (!this.apiKey && this.provider !== 'anthropic') {
      logger.warn('API key not configured', { provider: this.provider });
    }
  }

  /**
   * Helper for HTTP requests
   */
  private _httpRequest(options: HttpRequestOptions, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve(body as unknown as Record<string, unknown>);
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
   * @param messages - Chat messages
   * @param options - Chat options
   * @returns Response
   */
  async chat(messages: Message[], options: ChatOptions = {}): Promise<ChatResponse> {
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
  private async _chatAnthropic(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
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
  private async _chatMoonshot(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
    const modelName = this.model === 'sonnet' ? 'moonshot-v1-8k' : this.model;
    const data = {
      model: modelName,
      messages: messages,
      temperature: options.temperature || 0.3
    };

    const reqOptions: HttpRequestOptions = {
      hostname: 'api.moonshot.cn',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };

    try {
      const response = await this._httpRequest(reqOptions, data) as Record<string, unknown>;
      const choices = response.choices as Array<{ message: { content: string } }> | undefined;
      return {
        content: choices?.[0]?.message?.content || '',
        provider: 'moonshot',
        model: modelName
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Moonshot API error', { error: err.message });
      throw error;
    }
  }

  /**
   * Alibaba Qwen API (DashScope)
   */
  private async _chatQwen(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
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

    const reqOptions: HttpRequestOptions = {
      hostname: 'dashscope.aliyuncs.com',
      path: '/api/v1/services/aigc/text-generation/generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };

    try {
      const response = await this._httpRequest(reqOptions, data) as Record<string, unknown>;
      const output = response.output as { choices?: Array<{ message: { content: string } }> } | undefined;
      return {
        content: output?.choices?.[0]?.message?.content || '',
        provider: 'alibaba',
        model: modelName
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Qwen API error', { error: err.message });
      throw error;
    }
  }

  /**
   * OpenAI API
   */
  private async _chatOpenAI(messages: Message[], options: ChatOptions): Promise<ChatResponse> {
    const modelName = this.model === 'sonnet' ? 'gpt-4-turbo' : this.model;
    const data = {
      model: modelName,
      messages: messages,
      temperature: options.temperature || 0.3
    };

    const reqOptions: HttpRequestOptions = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };

    try {
      const response = await this._httpRequest(reqOptions, data) as Record<string, unknown>;
      const choices = response.choices as Array<{ message: { content: string } }> | undefined;
      return {
        content: choices?.[0]?.message?.content || '',
        provider: 'openai',
        model: modelName
      };
    } catch (error) {
      const err = error as Error;
      logger.error('OpenAI API error', { error: err.message });
      throw error;
    }
  }

  /**
   * Count tokens (approximate)
   * @param text - Text to count
   * @returns Approximate token count
   */
  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get provider info
   * @returns Provider information
   */
  getInfo(): { provider: string; model: string; hasApiKey: boolean } {
    return {
      provider: this.provider,
      model: this.model,
      hasApiKey: !!this.apiKey
    };
  }
}

/**
 * Create provider from config
 * @param config - Provider config
 * @returns Model provider instance
 */
function createProvider(config: ProviderConfig): ModelProvider {
  return new ModelProvider(config);
}

export { ModelProvider, createProvider };

export type { ProviderConfig, ChatOptions, ChatResponse, Message };
