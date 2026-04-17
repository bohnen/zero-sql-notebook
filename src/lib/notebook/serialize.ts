import type { Cell } from './types';

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

export function serialize(options: { frontmatter?: string | null; cells: Cell[] }): string {
  const body = serializeCells(options.cells);
  if (options.frontmatter && options.frontmatter.length > 0) {
    return `---\n${options.frontmatter}\n---\n\n${body}`;
  }
  return body;
}
