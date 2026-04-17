import type { Cell } from './types';
import { formatFrontmatter, type FrontmatterMeta } from './frontmatter';

export function serializeCells(cells: Cell[]): string {
  const parts: string[] = [];
  for (const cell of cells) {
    if (cell.type === 'markdown') {
      parts.push(cell.source);
    } else {
      parts.push('```' + cell.type + '\n' + cell.source + '\n```');
    }
  }
  return parts.join('\n\n');
}

export function serialize(options: {
  frontmatter?: string | null;
  meta?: FrontmatterMeta;
  cells: Cell[];
}): string {
  const body = serializeCells(options.cells);
  const fm = options.meta ? formatFrontmatter(options.meta) : (options.frontmatter ?? '');
  if (fm && fm.length > 0) {
    return `---\n${fm}\n---\n\n${body}`;
  }
  return body;
}
