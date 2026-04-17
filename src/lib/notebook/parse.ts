import type { Cell, CellType } from './types';
import { newId } from './ids';

const FENCE_RE = /^```(sql|env)\s*$/;
const CLOSING_FENCE_RE = /^```\s*$/;
const FRONTMATTER_DELIM = '---';

export interface ParsedDocument {
  frontmatter: string | null;
  cells: Cell[];
}

export function parseMarkdown(src: string): ParsedDocument {
  const lines = src.split('\n');
  let cursor = 0;

  const frontmatter = readFrontmatter(lines);
  if (frontmatter) cursor = frontmatter.endIndex + 1;

  const cells: Cell[] = [];
  let mdBuffer: string[] = [];

  const flushMarkdown = () => {
    if (mdBuffer.length === 0) return;
    const text = trimSurroundingBlankLines(mdBuffer).join('\n');
    if (text.length > 0) {
      cells.push({ id: newId(), type: 'markdown', source: text });
    }
    mdBuffer = [];
  };

  while (cursor < lines.length) {
    const line = lines[cursor];
    const fence = line.match(FENCE_RE);
    if (fence) {
      flushMarkdown();
      const lang = fence[1] as 'sql' | 'env';
      const body: string[] = [];
      cursor += 1;
      while (cursor < lines.length && !CLOSING_FENCE_RE.test(lines[cursor])) {
        body.push(lines[cursor]);
        cursor += 1;
      }
      if (cursor < lines.length) cursor += 1;
      cells.push({ id: newId(), type: lang satisfies CellType, source: body.join('\n') });
      continue;
    }
    mdBuffer.push(line);
    cursor += 1;
  }
  flushMarkdown();

  return {
    frontmatter: frontmatter ? frontmatter.raw : null,
    cells,
  };
}

interface FrontmatterReadResult {
  raw: string;
  endIndex: number;
}

function readFrontmatter(lines: string[]): FrontmatterReadResult | null {
  if (lines[0] !== FRONTMATTER_DELIM) return null;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === FRONTMATTER_DELIM) {
      return {
        raw: lines.slice(1, i).join('\n'),
        endIndex: i,
      };
    }
  }
  return null;
}

function trimSurroundingBlankLines(buf: string[]): string[] {
  let start = 0;
  let end = buf.length;
  while (start < end && buf[start].trim() === '') start += 1;
  while (end > start && buf[end - 1].trim() === '') end -= 1;
  return buf.slice(start, end);
}
