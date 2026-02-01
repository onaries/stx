import { client, getEvents, type SyncthingEvent } from "./syncthingApi.js";

export type ServerEvents = {
  server: string;
  url: string;
  error?: string;
  events?: SyncthingEvent[];
};

export type FetchEventsOptions = {
  since?: number;
  limit?: number;
  types?: string[];
};

export async function fetchServerEvents(
  serverName: string,
  url: string,
  apiKey: string,
  opts: FetchEventsOptions = {},
): Promise<ServerEvents> {
  const c = client(url, apiKey);

  try {
    const events = await getEvents(c, {
      since: opts.since,
      limit: opts.limit,
      events: opts.types,
      timeout: 1,
    });
    return {
      server: serverName,
      url,
      events,
    };
  } catch (err) {
    return {
      server: serverName,
      url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function formatEventsText(data: ServerEvents): string {
  const lines: string[] = [];

  lines.push(`=== ${data.server} (${data.url}) ===`);

  if (data.error) {
    lines.push(`  ERROR: ${data.error}`);
    return lines.join("\n");
  }

  if (!data.events || data.events.length === 0) {
    lines.push("  No events");
    return lines.join("\n");
  }

  for (const e of data.events) {
    const time = new Date(e.time).toLocaleString();
    lines.push(`  [${e.id}] ${time} - ${e.type}`);
    if (Object.keys(e.data).length > 0) {
      lines.push(`      ${JSON.stringify(e.data)}`);
    }
  }

  return lines.join("\n");
}
