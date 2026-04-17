export type HeadlineElement = {
  kind: 'headline';
  depth: number;
  text: string;
};

export type ModelRefElement = {
  kind: 'model-ref';
  name: string;
};

export type PromptElement = {
  kind: 'prompt';
  lines: string[];
};

export type CodeBlockElement = {
  kind: 'code-block';
  language: string;
  body: string;
};

export type ParsedElement =
  | HeadlineElement
  | ModelRefElement
  | PromptElement
  | CodeBlockElement;

export type ProviderName =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'mistral'
  | 'openrouter'
  | 'bedrock'
  | 'azure'
  | 'deepseek'
  | 'gateway'
  | 'ollama';

export type ModelSpec = {
  provider: ProviderName;
  modelId: string;
  displayName: string;
};

export type HistoryEntry =
  | { type: 'headline'; depth: number; text: string }
  | { type: 'prompt'; content: string }
  | { type: 'llm-output'; content: string }
  | { type: 'code'; language: string; script: string }
  | { type: 'code-output'; exitCode: number; output: string };

export type SessionContext = {
  historyFile: string;
  history: HistoryEntry[];
  iterationsLeft: number;
};
