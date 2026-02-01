import {
  client,
  getErrors,
  clearErrors,
  type SystemError,
} from "./syncthingApi.js";

export type ServerErrors = {
  server: string;
  url: string;
  error?: string;
  errors?: SystemError[];
};

export type AggregatedErrors = {
  servers: ServerErrors[];
};

export async function fetchServerErrors(
  serverName: string,
  url: string,
  apiKey: string,
): Promise<ServerErrors> {
  const c = client(url, apiKey);

  try {
    const response = await getErrors(c);
    return {
      server: serverName,
      url,
      errors: response.errors ?? [],
    };
  } catch (err) {
    return {
      server: serverName,
      url,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function clearServerErrors(
  serverName: string,
  url: string,
  apiKey: string,
): Promise<{ server: string; cleared: boolean; error?: string }> {
  const c = client(url, apiKey);

  try {
    await clearErrors(c);
    return { server: serverName, cleared: true };
  } catch (err) {
    return {
      server: serverName,
      cleared: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchAllServersErrors(
  servers: Record<string, { url: string; apiKey: string }>,
): Promise<AggregatedErrors> {
  const entries = Object.entries(servers);
  const results = await Promise.all(
    entries.map(([name, { url, apiKey }]) =>
      fetchServerErrors(name, url, apiKey),
    ),
  );
  return { servers: results };
}

export async function clearAllServersErrors(
  servers: Record<string, { url: string; apiKey: string }>,
): Promise<Array<{ server: string; cleared: boolean; error?: string }>> {
  const entries = Object.entries(servers);
  return Promise.all(
    entries.map(([name, { url, apiKey }]) =>
      clearServerErrors(name, url, apiKey),
    ),
  );
}

export function formatErrorsText(data: AggregatedErrors): string {
  const lines: string[] = [];

  for (const s of data.servers) {
    lines.push(`=== ${s.server} (${s.url}) ===`);

    if (s.error) {
      lines.push(`  ERROR: ${s.error}`);
      lines.push("");
      continue;
    }

    if (!s.errors || s.errors.length === 0) {
      lines.push("  No errors");
    } else {
      for (const e of s.errors) {
        const when = new Date(e.when).toLocaleString();
        lines.push(`  [${when}] ${e.message}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
