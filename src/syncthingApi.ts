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

async function httpJson<T>(c: SyncthingClient, method: string, path: string, body?: any): Promise<T> {
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
  const text = await request(`${c.baseUrl}/rest/noauth/deviceid`, { method: "GET" }).then(async (r) => {
    const t = await r.body.text();
    if (r.statusCode !== 200) throw new Error(`GET /rest/noauth/deviceid -> ${r.statusCode}: ${t}`);
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

export async function setIgnores(c: SyncthingClient, folderId: string, ignoreLines: string[]): Promise<void> {
  // POST /rest/db/ignores?folder=<id> with {"ignore":[...]} per docs
  await httpJson<void>(c, "POST", `/rest/db/ignores?folder=${encodeURIComponent(folderId)}`, {
    ignore: ignoreLines,
  });
}
