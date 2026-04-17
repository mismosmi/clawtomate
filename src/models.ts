import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { mistral } from '@ai-sdk/mistral';
import { deepseek } from '@ai-sdk/deepseek';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { azure } from '@ai-sdk/azure';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { ollama } from 'ollama-ai-provider';
import { createGateway } from 'ai';
import type { LanguageModel } from 'ai';
import type { ModelSpec, ProviderName } from './types.js';

// empty array = no API key required (e.g. Ollama runs locally)
const PROVIDER_ENV_MAP: Record<ProviderName, string[]> = {
  anthropic:   ['ANTHROPIC_API_KEY'],
  openai:      ['OPENAI_API_KEY'],
  google:      ['GOOGLE_GENERATIVE_AI_API_KEY'],
  mistral:     ['MISTRAL_API_KEY'],
  openrouter:  ['OPENROUTER_API_KEY'],
  bedrock:     ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'],
  azure:       ['AZURE_API_KEY', 'AZURE_RESOURCE_NAME'],
  deepseek:    ['DEEPSEEK_API_KEY'],
  gateway:     ['AI_GATEWAY_API_KEY'],
  ollama:      [],
};

const MODEL_ALIAS_MAP: Record<string, [ProviderName, string]> = {
  // Anthropic
  claude:          ['anthropic', 'claude-sonnet-4-6'],
  sonnet:          ['anthropic', 'claude-sonnet-4-6'],
  opus:            ['anthropic', 'claude-opus-4-7'],
  haiku:           ['anthropic', 'claude-haiku-4-5-20251001'],
  'claude-sonnet': ['anthropic', 'claude-sonnet-4-6'],
  'claude-opus':   ['anthropic', 'claude-opus-4-7'],
  'claude-haiku':  ['anthropic', 'claude-haiku-4-5-20251001'],

  // OpenAI
  gpt4:          ['openai', 'gpt-4o'],
  'gpt-4':       ['openai', 'gpt-4o'],
  gpt4o:         ['openai', 'gpt-4o'],
  'gpt-4o':      ['openai', 'gpt-4o'],
  'gpt4-mini':   ['openai', 'gpt-4o-mini'],
  'gpt-4o-mini': ['openai', 'gpt-4o-mini'],

  // Google
  gemini:          ['google', 'gemini-2.5-flash'],
  'gemini-pro':    ['google', 'gemini-2.5-pro'],
  'gemini-flash':  ['google', 'gemini-2.5-flash'],

  // Mistral
  mistral:          ['mistral', 'mistral-large-latest'],
  'mistral-large':  ['mistral', 'mistral-large-latest'],
  'mistral-small':  ['mistral', 'mistral-small-latest'],
  codestral:        ['mistral', 'codestral-latest'],

  // DeepSeek
  deepseek:           ['deepseek', 'deepseek-chat'],
  'deepseek-chat':    ['deepseek', 'deepseek-chat'],
  'deepseek-reason':  ['deepseek', 'deepseek-reasoner'],

  // OpenRouter (provider/model format)
  openrouter:                   ['openrouter', 'anthropic/claude-sonnet-4-6'],
  'or-claude':                  ['openrouter', 'anthropic/claude-sonnet-4-6'],
  'or-gpt4':                    ['openrouter', 'openai/gpt-4o'],
  'or-llama':                   ['openrouter', 'meta-llama/llama-3.1-405b-instruct'],

  // Amazon Bedrock
  bedrock:                      ['bedrock', 'anthropic.claude-3-5-sonnet-20241022-v2:0'],
  'bedrock-claude':             ['bedrock', 'anthropic.claude-3-5-sonnet-20241022-v2:0'],
  'bedrock-llama':              ['bedrock', 'meta.llama3-70b-instruct-v1:0'],
  'bedrock-nova':               ['bedrock', 'us.amazon.nova-pro-v1:0'],

  // Azure OpenAI (deployment names — user-defined in Azure portal)
  azure:                        ['azure', 'gpt-4o'],
  'azure-gpt4':                 ['azure', 'gpt-4o'],
  'azure-gpt4-mini':            ['azure', 'gpt-4o-mini'],

  // Vercel AI Gateway (provider/model format)
  gateway:                      ['gateway', 'anthropic/claude-sonnet-4-6'],
  'gw-claude':                  ['gateway', 'anthropic/claude-sonnet-4-6'],
  'gw-gpt4':                    ['gateway', 'openai/gpt-4o'],

  // Ollama (local)
  ollama:           ['ollama', 'llama3.2'],
  llama:            ['ollama', 'llama3.2'],
  'llama3':         ['ollama', 'llama3.2'],
  qwen:             ['ollama', 'qwen3:4b'],
  phi:              ['ollama', 'phi3'],
};

export function getAvailableProviders(): ProviderName[] {
  return (Object.keys(PROVIDER_ENV_MAP) as ProviderName[]).filter((p) =>
    PROVIDER_ENV_MAP[p].every((env) => !!process.env[env])
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
  const envKeys = PROVIDER_ENV_MAP[provider];
  const missing = envKeys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Model "@${name}" requires ${provider} but ${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} not set`
    );
  }
  return { provider, modelId, displayName: `@${name}` };
}

export function getDefaultModel(): ModelSpec {
  const available = getAvailableProviders();
  if (available.length === 0) {
    throw new Error(
      `No AI provider configured. Set at least one of: ${Object.values(PROVIDER_ENV_MAP).flatMap((v) => v).join(', ')}`
    );
  }
  const provider = available[0];
  const defaults: Record<ProviderName, string> = {
    anthropic:  'claude-sonnet-4-6',
    openai:     'gpt-4o',
    google:     'gemini-2.5-flash',
    mistral:    'mistral-large-latest',
    openrouter: 'anthropic/claude-sonnet-4-6',
    bedrock:    'anthropic.claude-3-5-sonnet-20241022-v2:0',
    azure:      'gpt-4o',
    deepseek:   'deepseek-chat',
    gateway:    'anthropic/claude-sonnet-4-6',
    ollama:     'llama3.2',
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
    case 'mistral':
      return mistral(spec.modelId);
    case 'deepseek':
      return deepseek(spec.modelId);
    case 'bedrock':
      return bedrock(spec.modelId);
    case 'azure':
      return azure(spec.modelId);
    case 'openrouter': {
      const or = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
      return or(spec.modelId);
    }
    case 'ollama':
      // ollama-ai-provider returns LanguageModelV1; cast required until it upgrades to V2/V3
      return ollama(spec.modelId) as unknown as LanguageModel;
    case 'gateway': {
      const gw = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });
      return gw(spec.modelId);
    }
  }
}
