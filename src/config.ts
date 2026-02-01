import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type ServerEntry = {
  name: string;
  url: string; // e.g. http://100.x.y.z:8384
  apiKey: string;
};

export type ConfigFile = {
  version: 1;
  servers: Record<string, Omit<ServerEntry, "name">>;
};

export function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return path.join(xdg, "stx");
  return path.join(os.homedir(), ".config", "stx");
}

export function configPath(): string {
  return path.join(configDir(), "servers.json");
}

export function ensureConfigDir(): void {
  fs.mkdirSync(configDir(), { recursive: true });
}

export function readConfig(): ConfigFile {
  ensureConfigDir();
  const p = configPath();
  if (!fs.existsSync(p)) {
    return { version: 1, servers: {} };
  }
  const raw = fs.readFileSync(p, "utf8");
  const parsed = JSON.parse(raw) as ConfigFile;
  if (!parsed.version) {
    // migrate legacy format
    return { version: 1, servers: (parsed as any).servers ?? {} };
  }
  return parsed;
}

export function writeConfig(cfg: ConfigFile): void {
  ensureConfigDir();
  const p = configPath();
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  try {
    fs.chmodSync(p, 0o600);
  } catch {
    // ignore
  }
}
