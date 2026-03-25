/**
 * Model Provider — Unified API for multiple AI providers
 */

import { defaultLogger as logger } from './logger.js';

// ─── Type Definitions ────────────────────────────────────────────────────────

export type ProviderType = 'anthropic' | 'moonshot' | 'alibaba' | 'openai';

export interface ModelConfig {
  provider: ProviderType;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ModelResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelProfile {
  quality: string;
  balanced: string;
  budget: string;
}

// ─── Model Provider Table ───────────────────────────────────────────────────

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  'ez-planner': { quality: 'opus', balanced: 'opus', budget: 'sonnet' },
  'ez-roadmapper': { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'ez-executor': { quality: 'opus', balanced: 'sonnet', budget: 'sonnet' },
  'ez-phase-researcher': { quality: 'opus', balanced: 'sonnet', budget: 'haiku' },
  'ez-codebase-mapper': { quality: 'sonnet', balanced: 'haiku', budget: 'haiku' },
  'ez-verifier': { quality: 'sonnet', balanced: 'sonnet', budget: 'haiku' },
};

// ─── Model Provider Functions ───────────────────────────────────────────────

/**
 * Get model for an agent based on profile
 */
export function getModelForAgent(agent: string, profile: string): string {
  const agentProfile = MODEL_PROFILES[agent];
  if (!agentProfile) {
    logger.warn('Unknown agent in model profile table', { agent });
    return 'inherit';
  }
  return agentProfile[profile as keyof ModelProfile] || agentProfile.balanced || 'inherit';
}

/**
 * Get provider configuration for a model
 */
export function getModelConfig(model: string, profile?: string): ModelConfig {
  // Determine provider from model name
  let provider: ProviderType;
  if (model.includes('claude')) {
    provider = 'anthropic';
  } else if (model.includes('moonshot')) {
    provider = 'moonshot';
  } else if (model.includes('qwen')) {
    provider = 'alibaba';
  } else if (model.includes('gpt')) {
    provider = 'openai';
  } else {
    provider = 'anthropic'; // Default
  }

  return {
    provider,
    model,
    maxTokens: 4096,
    temperature: 0.7
  };
}

/**
 * Get API key from environment for provider
 */
export function getApiKey(provider: ProviderType): string | undefined {
  const keyMap: Record<ProviderType, string> = {
    'anthropic': 'ANTHROPIC_API_KEY',
    'moonshot': 'MOONSHOT_API_KEY',
    'alibaba': 'ALIBABA_API_KEY',
    'openai': 'OPENAI_API_KEY'
  };
  return process.env[keyMap[provider]];
}

/**
 * Resolve model from config or environment
 */
export function resolveModel(agent: string, configProfile: string = 'balanced'): string {
  return getModelForAgent(agent, configProfile);
}

// Default export for backward compatibility
export default {
  MODEL_PROFILES,
  getModelForAgent,
  getModelConfig,
  getApiKey,
  resolveModel
};
