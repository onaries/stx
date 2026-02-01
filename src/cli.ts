#!/usr/bin/env node
import { Command } from "commander";
import readline from "node:readline";

import { readConfig, writeConfig } from "./config.js";
import { pairFolder } from "./pair.js";

const program = new Command();
program.name("stx").description("Syncthing helper CLI").version("0.1.0");

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const out = process.stdout;
    const rl = readline.createInterface({ input: process.stdin, output: out, terminal: true });
    // Hack: mask output while typing
    (rl as any)._writeToOutput = function _writeToOutput(_stringToWrite: string) {
      out.write("*");
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

program
  .command("add-server")
  .description("Register a Syncthing server (stores URL + API key locally)")
  .argument("<name>", "server name (e.g. safe-101)")
  .argument("<url>", "server Syncthing base URL (e.g. http://100.x.y.z:8384)")
  .action(async (name: string, url: string) => {
    const apiKey = await promptHidden("Server API key: ");
    const cfg = readConfig();
    cfg.servers[name] = { url, apiKey };
    writeConfig(cfg);
    console.log(`Saved server: ${name}`);
  });

program
  .command("list-servers")
  .description("List registered servers")
  .action(() => {
    const cfg = readConfig();
    const names = Object.keys(cfg.servers).sort();
    if (names.length === 0) {
      console.log("No servers registered.");
      return;
    }
    for (const n of names) {
      console.log(`${n}\t${cfg.servers[n].url}`);
    }
  });

program
  .command("remove-server")
  .description("Remove a registered server")
  .argument("<name>")
  .action((name: string) => {
    const cfg = readConfig();
    if (!cfg.servers[name]) {
      console.error(`No such server: ${name}`);
      process.exitCode = 1;
      return;
    }
    delete cfg.servers[name];
    writeConfig(cfg);
    console.log(`Removed server: ${name}`);
  });

program
  .command("pair")
  .description("Pair a folder from this Mac to a registered server")
  .requiredOption("--server <name>", "registered server name")
  .requiredOption("--folder-id <id>", "Syncthing folder ID (unique)")
  .requiredOption("--label <label>", "folder label")
  .requiredOption("--local-path <path>", "mac local path")
  .requiredOption("--server-path <path>", "server path")
  .option("--local-url <url>", "mac syncthing url", "http://127.0.0.1:8384")
  .option("--ignore-git", "also ignore .git")
  .option("--ignore-template <name>", "ignore template", "nodepython")
  .action(async (opts) => {
    const cfg = readConfig();
    const server = cfg.servers[opts.server];
    if (!server) {
      console.error(`Unknown server: ${opts.server}. Use: stx add-server ...`);
      process.exit(1);
    }
    await pairFolder({
      serverUrl: server.url,
      serverApiKey: server.apiKey,
      localUrl: opts.localUrl,
      folderId: opts.folderId,
      label: opts.label,
      localPath: opts.localPath,
      serverPath: opts.serverPath,
      ignoreGit: !!opts.ignoreGit,
      ignoreTemplate: opts.ignoreTemplate,
    });
  });

await program.parseAsync(process.argv);
