import crypto from "node:crypto";

export function generateFolderId(label: string): string {
  const kebab = toKebabCase(label);
  const hash = shortHash(label);
  return `${kebab}-${hash}`;
}

export function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function shortHash(str: string): string {
  const hash = crypto.createHash("sha256").update(str).digest("hex");
  return hash.slice(0, 4);
}
