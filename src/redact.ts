const SENSITIVE_KEYS = new Set([
  "apikey",
  "password",
  "passwd",
  "token",
  "accesstoken",
  "refreshtoken",
  "secret",
  "authorization",
]);

const REDACTED = "REDACTED";

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key.toLowerCase());
}

export function redact<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item)) as T;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redact(val);
      }
    }
    return result as T;
  }

  return value;
}
