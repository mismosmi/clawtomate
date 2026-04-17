import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import type { ModelSpec, ProviderName } from './types.js';

const PROVIDER_ENV_MAP: Record<ProviderName, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_GENERATIVE_AI_API_KEY',
};

const MODEL_ALIAS_MAP: Record<string, [ProviderName, string]> = {
  claude: ['anthropic', 'claude-sonnet-4-6'],
  sonnet: ['anthropic', 'claude-sonnet-4-6'],
  opus: ['anthropic', 'claude-opus-4-7'],
  haiku: ['anthropic', 'claude-haiku-4-5-20251001'],
  'claude-sonnet': ['anthropic', 'claude-sonnet-4-6'],
  'claude-opus': ['anthropic', 'claude-opus-4-7'],
  'claude-haiku': ['anthropic', 'claude-haiku-4-5-20251001'],
  gpt4: ['openai', 'gpt-4o'],
  'gpt-4': ['openai', 'gpt-4o'],
  gpt4o: ['openai', 'gpt-4o'],
  'gpt-4o': ['openai', 'gpt-4o'],
  'gpt4-mini': ['openai', 'gpt-4o-mini'],
  'gpt-4o-mini': ['openai', 'gpt-4o-mini'],
  gemini: ['google', 'gemini-2.5-flash'],
  'gemini-pro': ['google', 'gemini-2.5-pro'],
  'gemini-flash': ['google', 'gemini-2.5-flash'],
};

export function getAvailableProviders(): ProviderName[] {
  return (Object.keys(PROVIDER_ENV_MAP) as ProviderName[]).filter(
    (p) => !!process.env[PROVIDER_ENV_MAP[p]]
  );
}

export function resolveModelAlias(name: string): ModelSpec {
  const key = name.toLowerCase();
  const entry = MODEL_ALIAS_MAP[key];
  if (!entry) {
    throw new Error(
      `Unknown model alias "@${name}". Known aliases: ${Object.keys(MODEL_ALIAS_MAP).join(', ')}`
    );
  }
  const [provider, modelId] = entry;
  const envKey = PROVIDER_ENV_MAP[provider];
  if (!process.env[envKey]) {
    throw new Error(
      `Model "@${name}" requires ${provider} but ${envKey} is not set`
    );
  }
  return { provider, modelId, displayName: `@${name}` };
}

export function getDefaultModel(): ModelSpec {
  const available = getAvailableProviders();
  if (available.length === 0) {
    throw new Error(
      `No AI provider configured. Set at least one of: ${Object.values(PROVIDER_ENV_MAP).join(', ')}`
    );
  }
  const provider = available[0];
  const defaults: Record<ProviderName, string> = {
    anthropic: 'claude-sonnet-4-6',
    openai: 'gpt-4o',
    google: 'gemini-2.5-flash',
  };
  return {
    provider,
    modelId: defaults[provider],
    displayName: `(default ${provider}/${defaults[provider]})`,
  };
}

export function buildLanguageModel(spec: ModelSpec): LanguageModel {
  switch (spec.provider) {
    case 'anthropic':
      return anthropic(spec.modelId);
    case 'openai':
      return openai(spec.modelId);
    case 'google':
      return google(spec.modelId);
  }
}
