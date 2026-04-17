export interface FrontmatterMeta {
  title?: string;
  gistId?: string;
}

export function parseFrontmatter(raw: string | null): FrontmatterMeta {
  const meta: FrontmatterMeta = {};
  if (!raw) return meta;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const key = trimmed.slice(0, colon).trim();
    const value = unquote(trimmed.slice(colon + 1).trim());
    if (key === 'title') meta.title = value;
    else if (key === 'gist_id') meta.gistId = value;
  }
  return meta;
}

export function formatFrontmatter(meta: FrontmatterMeta): string {
  const lines: string[] = [];
  if (meta.title !== undefined) lines.push(`title: ${quote(meta.title)}`);
  if (meta.gistId) lines.push(`gist_id: ${quote(meta.gistId)}`);
  return lines.join('\n');
}

function unquote(raw: string): string {
  if (raw.length >= 2 && raw[0] === '"' && raw[raw.length - 1] === '"') {
    return raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return raw;
}

function quote(value: string): string {
  if (/^[A-Za-z0-9_\-./ ]+$/.test(value)) return value;
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
