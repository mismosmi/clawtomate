import pc from 'picocolors';

export function printHeadline(text: string, breadcrumbs: string[]): void {
  const crumb =
    breadcrumbs.length > 0
      ? pc.dim(breadcrumbs.join(' > ') + ' > ') + pc.bold(pc.yellow(text))
      : pc.bold(pc.yellow(text));
  process.stdout.write('\n' + crumb + '\n');
}

export function printModel(name: string, modelId: string): void {
  process.stdout.write(pc.blue(`@${name} → ${modelId}`) + '\n');
}

export function printError(msg: string): void {
  process.stderr.write(pc.red('[error] ' + msg) + '\n');
}

export function printInfo(msg: string): void {
  process.stdout.write(pc.dim('[info] ' + msg) + '\n');
}
