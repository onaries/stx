import { request } from "undici";

export type SyncthingClient = {
  baseUrl: string; // http://host:8384
  apiKey?: string;
};

function withSlash(u: string): string {
  return u.endsWith("/") ? u.slice(0, -1) : u;
}

export function client(baseUrl: string, apiKey?: string): SyncthingClient {
  return { baseUrl: withSlash(baseUrl), apiKey };
}

async function httpJson<T>(
  c: SyncthingClient,
  method: string,
  path: string,
  body?: any,
): Promise<T> {
  const url = `${c.baseUrl}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (c.apiKey) headers["X-API-Key"] = c.apiKey;

  let jsonBody: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    jsonBody = JSON.stringify(body);
  }

  const res = await request(url, {
    method: method as any,
    headers,
    body: jsonBody,
  });

  const text = await res.body.text();
  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`${method} ${path} -> ${res.statusCode}: ${text}`);
  }

  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function getDeviceIdNoAuth(c: SyncthingClient): Promise<string> {
  const text = await request(`${c.baseUrl}/rest/noauth/deviceid`, {
    method: "GET",
  }).then(async (r) => {
    const t = await r.body.text();
    if (r.statusCode !== 200)
      throw new Error(`GET /rest/noauth/deviceid -> ${r.statusCode}: ${t}`);
    return t;
  });
  return text.trim();
}

export async function getConfig(c: SyncthingClient): Promise<any> {
  return httpJson<any>(c, "GET", "/rest/system/config");
}

export async function putConfig(c: SyncthingClient, cfg: any): Promise<void> {
  await httpJson<void>(c, "PUT", "/rest/system/config", cfg);
}

export async function restart(c: SyncthingClient): Promise<void> {
  await httpJson<void>(c, "POST", "/rest/system/restart");
}

export async function setIgnores(
  c: SyncthingClient,
  folderId: string,
  ignoreLines: string[],
): Promise<void> {
  await httpJson<void>(
    c,
    "POST",
    `/rest/db/ignores?folder=${encodeURIComponent(folderId)}`,
    {
      ignore: ignoreLines,
    },
  );
}

export type SystemStatus = {
  myID: string;
  uptime: number;
  startTime: string;
  alloc: number;
  sys: number;
  goroutines: number;
  discoveryEnabled: boolean;
};

export type ConnectionInfo = {
  address: string;
  at: string;
  clientVersion: string;
  connected: boolean;
  inBytesTotal: number;
  outBytesTotal: number;
  paused: boolean;
  startedAt: string;
  type: string;
  isLocal?: boolean;
};

export type ConnectionsResponse = {
  connections: Record<string, ConnectionInfo>;
  total: {
    at: string;
    inBytesTotal: number;
    outBytesTotal: number;
  };
};

export type FolderStatus = {
  globalBytes: number;
  globalFiles: number;
  globalDirectories: number;
  globalDeleted: number;
  globalTotalItems: number;
  localBytes: number;
  localFiles: number;
  localDirectories: number;
  localDeleted: number;
  localTotalItems: number;
  needBytes: number;
  needFiles: number;
  inSyncBytes: number;
  inSyncFiles: number;
  pullErrors: number;
  state: string;
  stateChanged: string;
  version: number;
  ignorePatterns: boolean;
};

export type SystemError = {
  when: string;
  message: string;
};

export type ErrorsResponse = {
  errors: SystemError[] | null;
};

export type SyncthingEvent = {
  id: number;
  globalID: number;
  time: string;
  type: string;
  data: Record<string, unknown>;
};

export async function getSystemStatus(
  c: SyncthingClient,
): Promise<SystemStatus> {
  return httpJson<SystemStatus>(c, "GET", "/rest/system/status");
}

export async function getConnections(
  c: SyncthingClient,
): Promise<ConnectionsResponse> {
  return httpJson<ConnectionsResponse>(c, "GET", "/rest/system/connections");
}

export async function getFolderStatus(
  c: SyncthingClient,
  folderId: string,
): Promise<FolderStatus> {
  return httpJson<FolderStatus>(
    c,
    "GET",
    `/rest/db/status?folder=${encodeURIComponent(folderId)}`,
  );
}

export async function getErrors(c: SyncthingClient): Promise<ErrorsResponse> {
  return httpJson<ErrorsResponse>(c, "GET", "/rest/system/error");
}

export async function clearErrors(c: SyncthingClient): Promise<void> {
  await httpJson<void>(c, "POST", "/rest/system/error/clear");
}

export type GetEventsOptions = {
  since?: number;
  limit?: number;
  events?: string[];
  timeout?: number;
};

export async function getEvents(
  c: SyncthingClient,
  opts: GetEventsOptions = {},
): Promise<SyncthingEvent[]> {
  const params = new URLSearchParams();
  if (opts.since !== undefined) params.set("since", String(opts.since));
  if (opts.limit !== undefined) params.set("limit", String(opts.limit));
  if (opts.events && opts.events.length > 0)
    params.set("events", opts.events.join(","));
  if (opts.timeout !== undefined) params.set("timeout", String(opts.timeout));
  const query = params.toString();
  const path = query ? `/rest/events?${query}` : "/rest/events";
  return httpJson<SyncthingEvent[]>(c, "GET", path);
}
