import type { Notebook } from '../notebook/types';
import { parseMarkdown } from '../notebook/parse';
import { serialize } from '../notebook/serialize';

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

export function downloadNotebookMarkdown(notebook: Notebook): void {
  const body = serialize({ cells: notebook.cells });
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

export function parseImportedMarkdown(
  source: string,
  fallbackTitle = 'Imported',
): {
  title: string;
  cells: ReturnType<typeof parseMarkdown>['cells'];
} {
  const { cells } = parseMarkdown(source);
  const firstHeading = cells.find((c) => c.type === 'markdown');
  const headingMatch = firstHeading?.source.match(/^#\s+(.+)$/m);
  const title = headingMatch?.[1]?.trim() || fallbackTitle;
  return { title, cells };
}
