import type { Cell, Notebook } from '../notebook/types';
import { parseMarkdown } from '../notebook/parse';
import { serialize } from '../notebook/serialize';
import { parseFrontmatter } from '../notebook/frontmatter';

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'notebook'
  );
}

export function serializeNotebook(notebook: Notebook): string {
  return serialize({
    cells: notebook.cells,
    meta: {
      title: notebook.title,
      gistId: notebook.gistId,
    },
  });
}

export function downloadNotebookMarkdown(notebook: Notebook): void {
  const body = serializeNotebook(notebook);
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(notebook.title)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function readFileAsText(file: File): Promise<string> {
  return file.text();
}

export interface ImportedMarkdown {
  title: string;
  cells: Cell[];
  gistId?: string;
}

export function parseImportedMarkdown(
  source: string,
  fallbackTitle = 'Imported',
): ImportedMarkdown {
  const { cells, frontmatter } = parseMarkdown(source);
  const meta = parseFrontmatter(frontmatter);
  let title = meta.title;
  if (!title) {
    const firstMarkdown = cells.find((c) => c.type === 'markdown');
    const headingMatch = firstMarkdown?.source.match(/^#\s+(.+)$/m);
    title = headingMatch?.[1]?.trim() || fallbackTitle;
  }
  return { title, cells, gistId: meta.gistId };
}
