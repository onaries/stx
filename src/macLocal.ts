import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function readMacSyncthingApiKey(): string {
  const p = path.join(os.homedir(), "Library", "Application Support", "Syncthing", "config.xml");
  if (!fs.existsSync(p)) {
    throw new Error(`Mac Syncthing config.xml not found: ${p}`);
  }
  const xml = fs.readFileSync(p, "utf8");
  // minimal parse: <apikey>...</apikey>
  const m = xml.match(/<apikey>([^<]+)<\/apikey>/);
  if (!m) throw new Error("Could not find <apikey> in Mac Syncthing config.xml");
  return m[1].trim();
}
