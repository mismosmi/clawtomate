import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ParsedElement, SessionContext } from './types.js';
import { Session } from './session.js';
import { executeBlock } from './executor.js';
import { resolveModelAlias, getDefaultModel } from './models.js';
import { printHeadline, printModel, printError } from './display.js';
import { appendHistory } from './history.js';

export async function run(elements: ParsedElement[]): Promise<void> {
  const historyDir = mkdtempSync(join(tmpdir(), 'mdrun-session-'));
  const historyFile = join(historyDir, 'history.json');
  writeFileSync(historyFile, '[]', 'utf8');

  const context: SessionContext = { historyFile, history: [] };
  const session = new Session();
  const breadcrumbs: string[] = [];

  try {
    const defaultSpec = getDefaultModel();
    session.setModel(defaultSpec);
  } catch (e) {
    printError(String(e));
    process.exit(1);
  }

  for (const element of elements) {
    switch (element.kind) {
      case 'headline': {
        breadcrumbs.splice(element.depth - 1);
        printHeadline(element.text, breadcrumbs);
        breadcrumbs.push(element.text);
        appendHistory(context, { type: 'headline', depth: element.depth, text: element.text });
        break;
      }

      case 'model-ref': {
        try {
          const spec = resolveModelAlias(element.name);
          session.setModel(spec);
          printModel(element.name, spec.modelId);
        } catch (e) {
          printError(String(e));
          process.exit(1);
        }
        break;
      }

      case 'prompt': {
        const text = element.lines.join('\n').trim();
        if (!text) break;
        try {
          await session.chat(text, context);
        } catch (e) {
          printError(`AI call failed: ${e}`);
          process.exit(1);
        }
        break;
      }

      case 'code-block': {
        try {
          await executeBlock(element, session, context);
        } catch (e) {
          printError(`Code execution failed: ${e}`);
          process.exit(1);
        }
        break;
      }
    }
  }
}
