import type { SqlColumn } from '../execute/run';

export const ROW_RENDER_LIMIT = 1000;

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(columns: SqlColumn[], rows: unknown[][]): string {
  const lines: string[] = [];
  lines.push(columns.map((c) => csvEscape(c.name)).join(','));
  for (const row of rows) {
    lines.push(row.map((v) => csvEscape(cellToString(v))).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

function mdEscape(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

export function toMarkdownTable(columns: SqlColumn[], rows: unknown[][]): string {
  const header = '| ' + columns.map((c) => mdEscape(c.name)).join(' | ') + ' |';
  const divider = '| ' + columns.map(() => '---').join(' | ') + ' |';
  const body = rows
    .map((row) => '| ' + row.map((v) => mdEscape(cellToString(v))).join(' | ') + ' |')
    .join('\n');
  return [header, divider, body].filter((x) => x.length > 0).join('\n') + '\n';
}

export function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}
