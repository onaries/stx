import { describe, it, expect } from "vitest";
import { Command } from "commander";

function createTestProgram(): Command {
  const program = new Command();
  program.name("stx").version("0.1.0");

  program
    .command("status")
    .option("--server <name>")
    .option("--all")
    .option("--json");

  program
    .command("errors")
    .option("--server <name>")
    .option("--all")
    .option("--json")
    .option("--clear");

  program
    .command("events")
    .requiredOption("--server <name>")
    .option("--types <types>")
    .option("--since <id>")
    .option("--limit <n>")
    .option("--json");

  program
    .command("add-server")
    .argument("<name>")
    .argument("<url>")
    .option("--api-key <key>");

  program
    .command("pair")
    .requiredOption("--server <name>")
    .option("--folder-id <id>")
    .requiredOption("--label <label>")
    .requiredOption("--local-path <path>")
    .requiredOption("--server-path <path>")
    .option("--local-url <url>")
    .option("--server-key <key>")
    .option("--ssh <host>")
    .option("--ignore-git")
    .option("--ignore-template <name>");

  return program;
}

describe("CLI parsing", () => {
  describe("add-server command", () => {
    it("parses --api-key option", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "add-server",
        "safe-101",
        "http://100.1.2.3:8384",
        "--api-key",
        "my-key",
      ]);
      const cmd = program.commands.find((c) => c.name() === "add-server");
      expect(cmd?.opts().apiKey).toBe("my-key");
    });
  });

  describe("status command", () => {
    it("parses --server option", () => {
      const program = createTestProgram();
      program.parse(["node", "stx", "status", "--server", "myserver"]);
      const cmd = program.commands.find((c) => c.name() === "status");
      expect(cmd?.opts().server).toBe("myserver");
    });

    it("parses --all flag", () => {
      const program = createTestProgram();
      program.parse(["node", "stx", "status", "--all"]);
      const cmd = program.commands.find((c) => c.name() === "status");
      expect(cmd?.opts().all).toBe(true);
    });

    it("parses --json flag", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "status",
        "--server",
        "myserver",
        "--json",
      ]);
      const cmd = program.commands.find((c) => c.name() === "status");
      expect(cmd?.opts().json).toBe(true);
    });
  });

  describe("errors command", () => {
    it("parses --server option", () => {
      const program = createTestProgram();
      program.parse(["node", "stx", "errors", "--server", "myserver"]);
      const cmd = program.commands.find((c) => c.name() === "errors");
      expect(cmd?.opts().server).toBe("myserver");
    });

    it("parses --clear flag", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "errors",
        "--server",
        "myserver",
        "--clear",
      ]);
      const cmd = program.commands.find((c) => c.name() === "errors");
      expect(cmd?.opts().clear).toBe(true);
    });

    it("parses combined flags", () => {
      const program = createTestProgram();
      program.parse(["node", "stx", "errors", "--all", "--json"]);
      const cmd = program.commands.find((c) => c.name() === "errors");
      expect(cmd?.opts().all).toBe(true);
      expect(cmd?.opts().json).toBe(true);
    });
  });

  describe("events command", () => {
    it("parses --server (required)", () => {
      const program = createTestProgram();
      program.parse(["node", "stx", "events", "--server", "myserver"]);
      const cmd = program.commands.find((c) => c.name() === "events");
      expect(cmd?.opts().server).toBe("myserver");
    });

    it("parses --types option", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "events",
        "--server",
        "myserver",
        "--types",
        "FolderSummary,DeviceConnected",
      ]);
      const cmd = program.commands.find((c) => c.name() === "events");
      expect(cmd?.opts().types).toBe("FolderSummary,DeviceConnected");
    });

    it("parses --since option", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "events",
        "--server",
        "myserver",
        "--since",
        "100",
      ]);
      const cmd = program.commands.find((c) => c.name() === "events");
      expect(cmd?.opts().since).toBe("100");
    });

    it("parses --limit option", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "events",
        "--server",
        "myserver",
        "--limit",
        "50",
      ]);
      const cmd = program.commands.find((c) => c.name() === "events");
      expect(cmd?.opts().limit).toBe("50");
    });
  });

  describe("pair command", () => {
    it("parses required options", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "pair",
        "--server",
        "myserver",
        "--label",
        "My Project",
        "--local-path",
        "/Users/me/project",
        "--server-path",
        "/data/project",
      ]);
      const cmd = program.commands.find((c) => c.name() === "pair");
      expect(cmd?.opts().server).toBe("myserver");
      expect(cmd?.opts().label).toBe("My Project");
      expect(cmd?.opts().localPath).toBe("/Users/me/project");
      expect(cmd?.opts().serverPath).toBe("/data/project");
    });

    it("parses optional --folder-id", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "pair",
        "--server",
        "myserver",
        "--folder-id",
        "my-custom-id",
        "--label",
        "My Project",
        "--local-path",
        "/Users/me/project",
        "--server-path",
        "/data/project",
      ]);
      const cmd = program.commands.find((c) => c.name() === "pair");
      expect(cmd?.opts().folderId).toBe("my-custom-id");
    });

    it("parses --server-key override", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "pair",
        "--server",
        "myserver",
        "--server-key",
        "my-api-key",
        "--label",
        "My Project",
        "--local-path",
        "/Users/me/project",
        "--server-path",
        "/data/project",
      ]);
      const cmd = program.commands.find((c) => c.name() === "pair");
      expect(cmd?.opts().serverKey).toBe("my-api-key");
    });

    it("parses --ssh option", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "pair",
        "--server",
        "myserver",
        "--label",
        "My Project",
        "--local-path",
        "/Users/me/project",
        "--server-path",
        "/data/project",
        "--ssh",
        "user@remote-host",
      ]);
      const cmd = program.commands.find((c) => c.name() === "pair");
      expect(cmd?.opts().ssh).toBe("user@remote-host");
    });

    it("parses --ignore-git flag", () => {
      const program = createTestProgram();
      program.parse([
        "node",
        "stx",
        "pair",
        "--server",
        "myserver",
        "--label",
        "My Project",
        "--local-path",
        "/Users/me/project",
        "--server-path",
        "/data/project",
        "--ignore-git",
      ]);
      const cmd = program.commands.find((c) => c.name() === "pair");
      expect(cmd?.opts().ignoreGit).toBe(true);
    });
  });
});
