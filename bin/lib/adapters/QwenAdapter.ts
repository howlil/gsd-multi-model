/**
 * Qwen Adapter
 *
 * Adapts Alibaba Qwen (DashScope) API to the ModelProviderAdapter interface.
 * Qwen is a Chinese LLM provider with strong multilingual capabilities.
 *
 * @example
 * ```typescript
 * const adapter = new QwenAdapter(apiKey, 'qwen-max');
 * const response = await adapter.chat(messages, { temperature: 0.7 });
 * ```
 */

import * as https from 'https';
import { LogExecution } from '../decorators/LogExecution.js';
import { defaultLogger as logger } from '../logger.js';
import type { ModelProviderAdapter, Message, ModelOptions, ModelResponse, TokenUsage } from './ModelProviderAdapter.js';
import type { ToolCall } from '../assistant-adapter.js';

/**
 * Qwen Adapter class
 *
 * Implements the ModelProviderAdapter interface for Alibaba Qwen API.
 */
export class QwenAdapter implements ModelProviderAdapter {
  private apiKey: string;
  private modelName: string;

  /**
   * Create Qwen adapter
   * @param apiKey - Alibaba DashScope API key
   * @param modelName - Model name (default: 'qwen-max')
   */
  constructor(apiKey: string, modelName: string = 'qwen-max') {
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  /**
   * Get provider name
   * @returns 'qwen'
   */
  getName(): string {
    return 'qwen';
  }

  /**
   * Check if Qwen supports tools
   * @returns true (Qwen supports function calling)
   */
  supportsTools(): boolean {
    return true;
  }

  /**
   * Get maximum tokens for Qwen
   * @returns 32000 (Qwen's context window)
   */
  getMaxTokens(): number {
    return 32000;
  }

  /**
   * Send chat message to Qwen
   * @param messages - Array of chat messages
   * @param options - Chat options
   * @returns Model response
   */
  @LogExecution('QwenAdapter.chat', { logParams: false, logResult: false, level: 'debug' })
  async chat(messages: Message[], options: ModelOptions = {}): Promise<ModelResponse> {
    logger.debug('Qwen chat request', {
      model: this.modelName,
      messageCount: messages.length,
      hasTools: !!options.tools
    });

    if (!this.apiKey) {
      throw new Error('Qwen API key not configured');
    }

    // Convert messages to Qwen format
    const qwenMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Build request body
    const requestBody: Record<string, unknown> = {
      model: this.modelName,
      input: {
        messages: qwenMessages
      },
      parameters: {
        result_format: 'message',
        max_tokens: options.maxTokens || 4096
      }
    } as any;

    if (options.temperature !== undefined) {
      (requestBody.parameters as any).temperature = options.temperature;
    }

    // Add tools if provided
    if (options.tools && options.tools.length > 0) {
      (requestBody.parameters as any).tools = options.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }));
    }

    try {
      const response = await this._httpsRequest({
        hostname: 'dashscope.aliyuncs.com',
        path: '/api/v1/services/aigc/text-generation/generation',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      }, requestBody);

      // Parse response
      const output = response.output as { choices?: Array<{ message: { content: string } }> } | undefined;
      const content = output?.choices?.[0]?.message?.content || '';

      // Extract usage
      const usage = response.usage ? {
        promptTokens: (response.usage as any).input_tokens || 0,
        completionTokens: (response.usage as any).output_tokens || 0,
        totalTokens: (response.usage as any).total_tokens || 0
      } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      return {
        content,
        usage
      };
    } catch (error) {
      const err = error as Error;
      logger.error('Qwen API error', { error: err.message });
      throw error;
    }
  }

  /**
   * Helper for HTTPS requests
   * @param options - HTTPS options
   * @param data - Request data
   * @returns Response data
   * @private
   */
  private _httpsRequest(options: Record<string, unknown>, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve({ raw: body });
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
}
