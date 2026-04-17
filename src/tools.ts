import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import type { SessionContext } from './types.js';

export function buildTools(context: SessionContext) {
  return {
    bash: tool({
      description: 'Run a shell command and return its stdout, stderr, and exit code',
      inputSchema: zodSchema(
        z.object({ command: z.string().describe('Shell command to execute') })
      ),
      execute: async ({ command }: { command: string }) => {
        const result = spawnSync('sh', ['-c', command], {
          encoding: 'utf8',
          timeout: 30_000,
        });
        return {
          stdout: result.stdout ?? '',
          stderr: result.stderr ?? '',
          exitCode: result.status ?? 1,
        };
      },
    }),

    readFile: tool({
      description: 'Read the contents of a file',
      inputSchema: zodSchema(
        z.object({ path: z.string().describe('Path to the file to read') })
      ),
      execute: async ({ path }: { path: string }) => {
        try {
          return { content: readFileSync(path, 'utf8') };
        } catch (e) {
          return { error: String(e) };
        }
      },
    }),

    writeFile: tool({
      description: 'Write content to a file, overwriting if it exists',
      inputSchema: zodSchema(
        z.object({
          path: z.string().describe('Path to write to'),
          content: z.string().describe('File content'),
        })
      ),
      execute: async ({ path, content }: { path: string; content: string }) => {
        try {
          writeFileSync(path, content, 'utf8');
          return { success: true };
        } catch (e) {
          return { success: false, error: String(e) };
        }
      },
    }),

    getContext: tool({
      description:
        'Get the path to the session history JSON file containing all headlines, prompts, LLM outputs, code blocks, and code outputs so far',
      inputSchema: zodSchema(z.object({})),
      execute: async () => ({ historyFile: context.historyFile }),
    }),
  };
}
