/**
 * LLM Provider Adapter Factory
 */

import { Model } from '@excel-ai-agent/shared';
import { LLMProvider } from './types';
import { createOpenAIAdapter } from './openaiAdapter';
import { createAnthropicAdapter } from './anthropicAdapter';
import { createGoogleAdapter } from './googleAdapter';

export * from './types';
export * from './openaiAdapter';
export * from './anthropicAdapter';
export * from './googleAdapter';

/**
 * Creates an LLM provider adapter based on the model configuration
 */
export function createProviderAdapter(model: Model): LLMProvider | null {
  switch (model.provider) {
    case 'openai':
      return createOpenAIAdapter(model.id);
    case 'anthropic':
      return createAnthropicAdapter(model.id);
    case 'google':
      return createGoogleAdapter(model.id);
    default:
      console.error(`Unknown provider: ${model.provider}`);
      return null;
  }
}

/**
 * Get available providers based on environment configuration
 */
export function getAvailableProviders(): string[] {
  const providers: string[] = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push('openai');
  }
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push('anthropic');
  }
  if (process.env.GOOGLE_API_KEY) {
    providers.push('google');
  }

  return providers;
}
