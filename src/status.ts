import {
  client,
  getConfig,
  getConnections,
  getFolderStatus,
  getSystemStatus,
} from './syncthingApi.js';

export type DeviceInfo = {
  deviceID: string;
  name: string;
  connected: boolean;
  address?: string;
  clientVersion?: string;
  inBytesTotal?: number;
  outBytesTotal?: number;
  completion?: number;
};

export type FolderInfo = {
  id: string;
  label: string;
  state: string;
  globalBytes: number;
  localBytes: number;
  needBytes: number;
  pullErrors: number;
};

export type ServerStatus = {
  server: string;
  url: string;
  error?: string;
  system?: {
    deviceID: string;
    uptime: number;
    startTime: string;
    version?: string;
  };
  folders?: FolderInfo[];
  devices?: DeviceInfo[];
};

export type AggregatedStatus = {
  servers: ServerStatus[];
};

export async function fetchServerStatus(
  serverName: string,
  url: string,
  apiKey: string
): Promise<ServerStatus> {
  const c = client(url, apiKey);

  try {
    const [systemStatus, connections, config] = await Promise.all([
      getSystemStatus(c),
      getConnections(c),
      getConfig(c),
    ]);

    const folders: FolderInfo[] = [];
    const folderConfigs: Array<{ id: string; label: string }> = config.folders ?? [];

    const folderStatuses = await Promise.all(
      folderConfigs.map(async (f) => {
        try {
          const status = await getFolderStatus(c, f.id);
          return { id: f.id, label: f.label, status };
        } catch {
          return { id: f.id, label: f.label, status: null };
        }
      })
    );

    for (const { id, label, status } of folderStatuses) {
      if (status) {
        folders.push({
          id,
          label,
          state: status.state,
          globalBytes: status.globalBytes,
          localBytes: status.localBytes,
          needBytes: status.needBytes,
          pullErrors: status.pullErrors,
        });
      }
    }

    const devices: DeviceInfo[] = [];
    const deviceConfigs: Array<{ deviceID: string; name: string }> = config.devices ?? [];

    for (const d of deviceConfigs) {
      if (d.deviceID === systemStatus.myID) continue;

      const conn = connections.connections[d.deviceID];
      devices.push({
        deviceID: d.deviceID,
        name: d.name,
        connected: conn?.connected ?? false,
        address: conn?.address,
        clientVersion: conn?.clientVersion,
        inBytesTotal: conn?.inBytesTotal,
        outBytesTotal: conn?.outBytesTotal,
      });
    }

    return {
      server: serverName,
      url,
      system: {
        deviceID: systemStatus.myID,
        uptime: systemStatus.uptime,
        startTime: systemStatus.startTime,
      },
      folders,
      devices,
    };
  } catch (err) {
    return {
      server: serverName,
      url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchAllServersStatus(
  servers: Record<string, { url: string; apiKey: string }>
): Promise<AggregatedStatus> {
  const entries = Object.entries(servers);
  const results = await Promise.all(
    entries.map(([name, { url, apiKey }]) => fetchServerStatus(name, url, apiKey))
  );
  return { servers: results };
}

export function formatStatusText(status: AggregatedStatus): string {
  const lines: string[] = [];

  for (const s of status.servers) {
    lines.push(`=== ${s.server} (${s.url}) ===`);

    if (s.error) {
      lines.push(`  ERROR: ${s.error}`);
      lines.push('');
      continue;
    }

    if (s.system) {
      const uptimeHours = Math.floor(s.system.uptime / 3600);
      const uptimeMins = Math.floor((s.system.uptime % 3600) / 60);
      lines.push(`  Device ID: ${s.system.deviceID.slice(0, 7)}...`);
      lines.push(`  Uptime: ${uptimeHours}h ${uptimeMins}m`);
    }

    if (s.folders && s.folders.length > 0) {
      lines.push('');
      lines.push('  Folders:');
      for (const f of s.folders) {
        const globalMB = (f.globalBytes / 1024 / 1024).toFixed(1);
        const localMB = (f.localBytes / 1024 / 1024).toFixed(1);
        lines.push(`    - ${f.label} (${f.id}): ${f.state}`);
        lines.push(`      Global: ${globalMB} MB, Local: ${localMB} MB`);
        if (f.pullErrors > 0) {
          lines.push(`      Pull Errors: ${f.pullErrors}`);
        }
      }
    }

    if (s.devices && s.devices.length > 0) {
      lines.push('');
      lines.push('  Devices:');
      for (const d of s.devices) {
        const status = d.connected ? 'connected' : 'disconnected';
        lines.push(`    - ${d.name} (${d.deviceID.slice(0, 7)}...): ${status}`);
        if (d.connected && d.clientVersion) {
          lines.push(`      Version: ${d.clientVersion}`);
        }
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}
