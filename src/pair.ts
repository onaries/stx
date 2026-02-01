import fs from "node:fs";
import path from "node:path";

import { defaultIgnore } from "./ignoreTemplates.js";
import { readMacSyncthingApiKey } from "./macLocal.js";
import { client, getConfig, getDeviceIdNoAuth, putConfig, restart, setIgnores } from "./syncthingApi.js";

function upsertDevice(cfg: any, deviceID: string, name: string) {
  cfg.devices ??= [];
  if (!cfg.devices.some((d: any) => d.deviceID === deviceID)) {
    cfg.devices.push({
      deviceID,
      name,
      addresses: ["dynamic"],
      compression: "metadata",
      introducedBy: "",
    });
  }
}

function upsertFolder(cfg: any, folder: any) {
  cfg.folders ??= [];
  const i = cfg.folders.findIndex((f: any) => f.id === folder.id);
  if (i === -1) {
    cfg.folders.push(folder);
  } else {
    const existing = cfg.folders[i];
    cfg.folders[i] = {
      ...existing,
      ...folder,
      devices: mergeDevices(existing.devices ?? [], folder.devices ?? []),
    };
  }
}

function mergeDevices(a: any[], b: any[]): any[] {
  const out: any[] = [...a];
  for (const d of b) {
    if (!out.some((x) => x.deviceID === d.deviceID)) out.push(d);
  }
  return out;
}

export type PairOptions = {
  serverUrl: string;
  serverApiKey: string;
  localUrl?: string; // default 127.0.0.1:8384
  folderId: string;
  label: string;
  localPath: string;
  serverPath: string;
  ignoreGit?: boolean;
  ignoreTemplate?: "nodepython";
};

export async function pairFolder(opts: PairOptions): Promise<void> {
  const localUrl = opts.localUrl ?? "http://127.0.0.1:8384";
  const localKey = readMacSyncthingApiKey();

  const local = client(localUrl, localKey);
  const server = client(opts.serverUrl, opts.serverApiKey);

  const [localId, serverId] = await Promise.all([getDeviceIdNoAuth(local), getDeviceIdNoAuth(server)]);

  // Ensure local path exists
  fs.mkdirSync(opts.localPath, { recursive: true });

  // 1) Update server config: add mac device + folder(receiveonly)
  const serverCfg = await getConfig(server);
  upsertDevice(serverCfg, localId, "macbook");
  upsertFolder(serverCfg, {
    id: opts.folderId,
    label: opts.label,
    path: opts.serverPath,
    type: "receiveonly",
    devices: [{ deviceID: localId }],
    rescanIntervalS: 3600,
    fsWatcherEnabled: true,
  });
  await putConfig(server, serverCfg);

  // 2) Update mac config: add server device + folder(sendreceive)
  const localCfg = await getConfig(local);
  upsertDevice(localCfg, serverId, "server");
  upsertFolder(localCfg, {
    id: opts.folderId,
    label: opts.label,
    path: opts.localPath,
    type: "sendreceive",
    devices: [{ deviceID: serverId }],
    rescanIntervalS: 3600,
    fsWatcherEnabled: true,
  });
  await putConfig(local, localCfg);

  // 3) Ignores on both
  const template = opts.ignoreTemplate ?? "nodepython";
  const ignores = defaultIgnore(template, { ignoreGit: !!opts.ignoreGit });
  await setIgnores(server, opts.folderId, ignores);
  await setIgnores(local, opts.folderId, ignores);

  // 4) Restart both (clean apply)
  await Promise.allSettled([restart(server), restart(local)]);

  console.log("OK");
  console.log(`- folderId: ${opts.folderId}`);
  console.log(`- mac   : ${opts.localPath} (Send&Receive)`);
  console.log(`- server: ${opts.serverPath} (ReceiveOnly)`);
}
