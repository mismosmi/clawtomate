import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";
import { parse } from "./parser.js";
import { run } from "./runner.js";
import { printError } from "./display.js";

const program = new Command();

program
  .name("clawtomate")
  .description("Markdown-driven AI orchestration CLI")
  .version("0.1.0")
  .argument("<file>", "Markdown file to execute")
  .action((file: string) => {
    const filePath = resolve(process.cwd(), file);
    let content: string;
    try {
      content = readFileSync(filePath, "utf8");
    } catch {
      printError(`Cannot read file: ${filePath}`);
      process.exit(1);
    }
    const elements = parse(content);
    run(elements).catch((err) => {
      printError(String(err));
      process.exit(1);
    });
  });

program.parseAsync(process.argv);
