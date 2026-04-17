import { generateText, streamText, stepCountIs, type ModelMessage, type LanguageModel } from 'ai';
import pc from 'picocolors';
import type { ModelSpec, SessionContext } from './types.js';
import { buildLanguageModel } from './models.js';
import { buildTools } from './tools.js';
import { appendHistory } from './history.js';

export class Session {
  private messages: ModelMessage[] = [];
  private model: LanguageModel | null = null;
  private spec: ModelSpec | null = null;

  setModel(spec: ModelSpec): void {
    this.spec = spec;
    this.model = buildLanguageModel(spec);
  }

  getSpec(): ModelSpec | null {
    return this.spec;
  }

  async chat(userText: string, context: SessionContext): Promise<string> {
    if (!this.model) {
      throw new Error('No model set. Use a @modelname reference first.');
    }

    appendHistory(context, { type: 'prompt', content: userText });
    this.messages.push({ role: 'user', content: userText });

    const tools = buildTools(context);
    const result = streamText({
      model: this.model,
      messages: this.messages,
      tools,
      stopWhen: stepCountIs(10),
    });

    process.stdout.write('\n');
    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        process.stdout.write(chunk.text);
      }
    }
    process.stdout.write('\n');

    const finalText = await result.text;
    this.messages.push({ role: 'assistant', content: finalText });
    appendHistory(context, { type: 'llm-output', content: finalText });

    return finalText;
  }

  async fix(userText: string, context: SessionContext): Promise<string> {
    if (!this.model) {
      throw new Error('No model set.');
    }

    appendHistory(context, { type: 'prompt', content: userText });
    this.messages.push({ role: 'user', content: userText });

    const tools = buildTools(context);
    const { text } = await generateText({
      model: this.model,
      messages: this.messages,
      tools,
      stopWhen: stepCountIs(10),
    });

    this.messages.push({ role: 'assistant', content: text });
    appendHistory(context, { type: 'llm-output', content: text });

    return text;
  }
}
