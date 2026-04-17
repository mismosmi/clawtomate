import { marked } from 'marked';
import type { ParsedElement } from './types.js';

export function parse(markdown: string): ParsedElement[] {
  const tokens = marked.lexer(markdown);
  const elements: ParsedElement[] = [];

  for (const token of tokens) {
    if (token.type === 'heading') {
      elements.push({ kind: 'headline', depth: token.depth, text: token.text });
    } else if (token.type === 'code') {
      elements.push({
        kind: 'code-block',
        language: token.lang || 'sh',
        body: token.text,
      });
    } else if (token.type === 'paragraph') {
      const trimmed = token.raw.trim();
      const modelMatch = trimmed.match(/^@([\w][\w-]*)$/);
      if (modelMatch) {
        elements.push({ kind: 'model-ref', name: modelMatch[1] });
      } else {
        const prev = elements[elements.length - 1];
        if (prev?.kind === 'prompt') {
          prev.lines.push(...token.text.split('\n'));
        } else {
          elements.push({ kind: 'prompt', lines: token.text.split('\n') });
        }
      }
    }
  }

  return elements;
}
