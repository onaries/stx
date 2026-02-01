#!/usr/bin/env node
import { Command } from "commander";
import readline from "node:readline";
import { execSync } from "node:child_process";

import { readConfig, writeConfig } from "./config.js";
import { pairFolder } from "./pair.js";
import { generateFolderId } from "./slug.js";
import {
  fetchServerStatus,
  fetchAllServersStatus,
  formatStatusText,
} from "./status.js";
import {
  fetchServerErrors,
  fetchAllServersErrors,
  clearServerErrors,
  clearAllServersErrors,
  formatErrorsText,
} from "./errors.js";
import { fetchServerEvents, formatEventsText } from "./events.js";

const program = new Command();
program.name("stx").description("Syncthing helper CLI").version("0.1.0");

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const out = process.stdout;
    const rl = readline.createInterface({
      input: process.stdin,
      output: out,
      terminal: true,
    });
    (rl as any)._writeToOutput = function _writeToOutput(
      _stringToWrite: string,
    ) {
      out.write("*");
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptConfirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${question} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

program
  .command("add-server")
  .description("Register a Syncthing server (stores URL + API key locally)")
  .argument("<name>", "server name (e.g. safe-101)")
  .argument("<url>", "server Syncthing base URL (e.g. http://100.x.y.z:8384)")
  .option(
    "--api-key <key>",
    "server API key (WARNING: visible in shell history; prefer prompt)",
  )
  .action(async (name: string, url: string, opts: { apiKey?: string }) => {
    const apiKey = opts.apiKey ?? (await promptHidden("Server API key: "));
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
  .option(
    "--folder-id <id>",
    "Syncthing folder ID (auto-generated from label if omitted)",
  )
  .requiredOption("--label <label>", "folder label")
  .requiredOption("--local-path <path>", "mac local path")
  .requiredOption("--server-path <path>", "server path")
  .option("--local-url <url>", "mac syncthing url", "http://127.0.0.1:8384")
  .option(
    "--server-key <key>",
    "override server API key (not saved; visible in shell history!)",
  )
  .option("--ssh <host>", "SSH host to prepare server path (mkdir -p + chown)")
  .option("--ignore-git", "also ignore .git")
  .option("--ignore-template <name>", "ignore template", "nodepython")
  .action(async (opts) => {
    const cfg = readConfig();
    const server = cfg.servers[opts.server];

    let serverApiKey: string;
    if (opts.serverKey) {
      console.warn(
        "WARNING: --server-key is visible in shell history. Consider using add-server instead.",
      );
      serverApiKey = opts.serverKey;
    } else if (server) {
      serverApiKey = server.apiKey;
    } else {
      console.error(
        `Unknown server: ${opts.server}. Use: stx add-server ... or --server-key`,
      );
      process.exit(1);
    }

    const serverUrl = server?.url;
    if (!serverUrl && !opts.serverKey) {
      console.error(`Unknown server: ${opts.server}. Use: stx add-server ...`);
      process.exit(1);
    }

    const folderId = opts.folderId ?? generateFolderId(opts.label);

    if (opts.ssh) {
      const serverPath: string = opts.serverPath;
      const riskyPaths = [
        "/",
        "/root",
        "/home",
        "/var",
        "/etc",
        "/usr",
        "/tmp",
      ];
      if (
        riskyPaths.includes(serverPath) ||
        riskyPaths.some((p) => serverPath === p + "/")
      ) {
        console.error(`ERROR: Refusing to create risky path: ${serverPath}`);
        process.exit(1);
      }

      console.log(`Will run on ${opts.ssh}:`);
      console.log(`  mkdir -p "${serverPath}"`);
      console.log(`  chown syncthing:syncthing "${serverPath}"`);

      const confirmed = await promptConfirm("Proceed?");
      if (!confirmed) {
        console.log("Aborted.");
        process.exit(0);
      }

      try {
        execSync(
          `ssh ${opts.ssh} "mkdir -p '${serverPath}' && chown syncthing:syncthing '${serverPath}'"`,
          {
            stdio: "inherit",
          },
        );
        console.log("Server path prepared.");
      } catch (err) {
        console.error("Failed to prepare server path via SSH.");
        process.exit(1);
      }
    }

    await pairFolder({
      serverUrl: server?.url ?? `http://${opts.ssh}:8384`,
      serverApiKey,
      localUrl: opts.localUrl,
      folderId,
      label: opts.label,
      localPath: opts.localPath,
      serverPath: opts.serverPath,
      ignoreGit: !!opts.ignoreGit,
      ignoreTemplate: opts.ignoreTemplate,
    });

    console.log(`Folder ID: ${folderId}`);
  });

program
  .command("status")
  .description("Query Syncthing status for server(s)")
  .option("--server <name>", "specific server name")
  .option("--all", "query all registered servers")
  .option("--json", "output as JSON")
  .action(async (opts) => {
    const cfg = readConfig();

    if (!opts.server && !opts.all) {
      console.error("Specify --server <name> or --all");
      process.exit(1);
    }

    if (opts.server && opts.all) {
      console.error("Cannot use both --server and --all");
      process.exit(1);
    }

    if (opts.server) {
      const server = cfg.servers[opts.server];
      if (!server) {
        console.error(`Unknown server: ${opts.server}`);
        process.exit(1);
      }
      const status = await fetchServerStatus(
        opts.server,
        server.url,
        server.apiKey,
      );
      if (opts.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(formatStatusText({ servers: [status] }));
      }
    } else {
      const status = await fetchAllServersStatus(cfg.servers);
      if (opts.json) {
        console.log(JSON.stringify(status, null, 2));
      } else {
        console.log(formatStatusText(status));
      }
    }
  });

program
  .command("errors")
  .description("View or clear Syncthing errors")
  .option("--server <name>", "specific server name")
  .option("--all", "query all registered servers")
  .option("--json", "output as JSON")
  .option("--clear", "clear errors instead of viewing")
  .action(async (opts) => {
    const cfg = readConfig();

    if (!opts.server && !opts.all) {
      console.error("Specify --server <name> or --all");
      process.exit(1);
    }

    if (opts.server && opts.all) {
      console.error("Cannot use both --server and --all");
      process.exit(1);
    }

    if (opts.clear) {
      if (opts.server) {
        const server = cfg.servers[opts.server];
        if (!server) {
          console.error(`Unknown server: ${opts.server}`);
          process.exit(1);
        }
        const result = await clearServerErrors(
          opts.server,
          server.url,
          server.apiKey,
        );
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(
            result.cleared
              ? `Cleared errors on ${opts.server}`
              : `Failed: ${result.error}`,
          );
        }
      } else {
        const results = await clearAllServersErrors(cfg.servers);
        if (opts.json) {
          console.log(JSON.stringify(results, null, 2));
        } else {
          for (const r of results) {
            console.log(
              r.cleared
                ? `Cleared errors on ${r.server}`
                : `${r.server}: Failed - ${r.error}`,
            );
          }
        }
      }
    } else {
      if (opts.server) {
        const server = cfg.servers[opts.server];
        if (!server) {
          console.error(`Unknown server: ${opts.server}`);
          process.exit(1);
        }
        const errors = await fetchServerErrors(
          opts.server,
          server.url,
          server.apiKey,
        );
        if (opts.json) {
          console.log(JSON.stringify(errors, null, 2));
        } else {
          console.log(formatErrorsText({ servers: [errors] }));
        }
      } else {
        const errors = await fetchAllServersErrors(cfg.servers);
        if (opts.json) {
          console.log(JSON.stringify(errors, null, 2));
        } else {
          console.log(formatErrorsText(errors));
        }
      }
    }
  });

program
  .command("events")
  .description("View Syncthing events")
  .requiredOption("--server <name>", "server name")
  .option("--types <types>", "comma-separated event types filter")
  .option("--since <id>", "event ID to start from", parseInt)
  .option("--limit <n>", "max events to return", parseInt)
  .option("--json", "output as JSON")
  .action(async (opts) => {
    const cfg = readConfig();
    const server = cfg.servers[opts.server];
    if (!server) {
      console.error(`Unknown server: ${opts.server}`);
      process.exit(1);
    }

    const types = opts.types
      ? opts.types.split(",").map((t: string) => t.trim())
      : undefined;

    const events = await fetchServerEvents(
      opts.server,
      server.url,
      server.apiKey,
      {
        since: opts.since,
        limit: opts.limit,
        types,
      },
    );

    if (opts.json) {
      console.log(JSON.stringify(events, null, 2));
    } else {
      console.log(formatEventsText(events));
    }
  });

await program.parseAsync(process.argv);
