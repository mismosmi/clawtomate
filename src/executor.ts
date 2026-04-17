import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pc from 'picocolors';
import type { CodeBlockElement, SessionContext } from './types.js';
import { appendHistory } from './history.js';
import type { Session } from './session.js';

const MAX_RETRIES = 5;

const LANG_RUNNER: Record<string, string> = {
  sh: 'sh',
  bash: 'bash',
  node: 'node',
  js: 'node',
};

type RunResult = { exitCode: number; output: string; outputFile: string };

function runScript(script: string, language: string, dir: string): RunResult {
  const runner = LANG_RUNNER[language] ?? 'sh';
  const ext = runner === 'node' ? 'mjs' : language;
  const scriptFile = join(dir, `script.${ext}`);
  const outputFile = join(dir, 'output.txt');

  writeFileSync(scriptFile, script, 'utf8');

  const result = spawnSync(runner, [scriptFile], {
    encoding: 'utf8',
    timeout: 120_000,
  });

  const output = (result.stdout ?? '') + (result.stderr ?? '');
  writeFileSync(outputFile, output, 'utf8');

  return {
    exitCode: result.status ?? 1,
    output,
    outputFile,
  };
}

function extractCodeBlock(text: string, preferLang: string): string | null {
  const candidates = [preferLang, 'sh', 'bash', ''];
  for (const lang of candidates) {
    const re = new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'm');
    const m = text.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

export async function executeBlock(
  block: CodeBlockElement,
  session: Session,
  context: SessionContext
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'mdrun-'));
  let script = block.body;

  appendHistory(context, { type: 'code', language: block.language, script });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    process.stdout.write(
      pc.dim(`\n[${block.language}] ${attempt > 0 ? `retry ${attempt}` : 'running'}\n`)
    );

    const result = runScript(script, block.language, dir);

    appendHistory(context, {
      type: 'code-output',
      exitCode: result.exitCode,
      output: result.output,
    });

    if (result.exitCode === 0) {
      process.stdout.write(pc.green('✓ exit 0\n'));
      if (result.output.trim()) {
        process.stdout.write(pc.dim(result.output) + '\n');
      }
      return;
    }

    process.stdout.write(pc.red(`✗ exit ${result.exitCode}\n`));
    if (result.output.trim()) {
      process.stdout.write(pc.dim(result.output) + '\n');
    }

    if (attempt === MAX_RETRIES) {
      throw new Error(
        `Script failed after ${MAX_RETRIES} fix attempts (exit ${result.exitCode})`
      );
    }

    const fixPrompt =
      `The following script failed\n\n${script}\n\n` +
      `the output is in ${result.outputFile}\n` +
      `fix the problem`;

    process.stdout.write(pc.yellow(`[fix ${attempt + 1}/${MAX_RETRIES}]\n`));
    const fixedText = await session.fix(fixPrompt, context);

    const extracted = extractCodeBlock(fixedText, block.language);
    if (!extracted) {
      throw new Error(
        `AI fix response contained no code block for language "${block.language}"`
      );
    }

    script = extracted;
    appendHistory(context, { type: 'code', language: block.language, script });
  }
}
