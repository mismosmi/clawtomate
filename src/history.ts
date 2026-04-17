import { writeFileSync } from 'node:fs';
import type { SessionContext, HistoryEntry } from './types.js';

export function appendHistory(context: SessionContext, entry: HistoryEntry): void {
  context.history.push(entry);
  writeFileSync(context.historyFile, JSON.stringify(context.history, null, 2), 'utf8');
}
