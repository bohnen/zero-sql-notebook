import { getAuth, initiateLogin } from '../auth/github.svelte';
import { createGist, GistAuthError, getGist, updateGist } from '../gist/client';
import type { Notebook } from '../notebook/types';
import { parseMarkdown } from '../notebook/parse';
import { parseFrontmatter } from '../notebook/frontmatter';
import { serialize } from '../notebook/serialize';

export interface ShareResult {
  gistId: string;
  gistUrl: string;
}

function toMarkdown(notebook: Notebook, gistId?: string): string {
  return serialize({
    cells: notebook.cells,
    meta: {
      title: notebook.title,
      gistId: gistId ?? notebook.gistId,
    },
  });
}

export async function shareNotebook(notebook: Notebook): Promise<ShareResult> {
  const auth = getAuth();
  if (!auth) {
    await initiateLogin({ kind: 'share', notebookId: notebook.id });
    throw new Error('Redirecting to GitHub…');
  }
  try {
    if (notebook.gistId) {
      const content = toMarkdown(notebook);
      const summary = await updateGist({
        token: auth.accessToken,
        id: notebook.gistId,
        title: notebook.title,
        content,
      });
      return { gistId: summary.id, gistUrl: summary.htmlUrl };
    }
    // First, create the gist without the gist_id so the frontmatter can then
    // be updated with the real id in a follow-up PATCH.
    const initial = await createGist({
      token: auth.accessToken,
      title: notebook.title,
      content: toMarkdown(notebook),
    });
    const updated = await updateGist({
      token: auth.accessToken,
      id: initial.id,
      title: notebook.title,
      content: toMarkdown(notebook, initial.id),
    });
    return { gistId: initial.id, gistUrl: updated.htmlUrl };
  } catch (err) {
    if (err instanceof GistAuthError) {
      await initiateLogin({ kind: 'share', notebookId: notebook.id });
    }
    throw err;
  }
}

export interface LoadedGistNotebook {
  gistId: string;
  notebook: Notebook;
}

export async function loadSharedGist(id: string): Promise<LoadedGistNotebook> {
  const token = getAuth()?.accessToken;
  const summary = await getGist(id, token);
  const { cells, frontmatter } = parseMarkdown(summary.content);
  const meta = parseFrontmatter(frontmatter);
  const title =
    meta.title ??
    cells
      .find((c) => c.type === 'markdown')
      ?.source.match(/^#\s+(.+)$/m)?.[1]
      ?.trim() ??
    summary.description ??
    'Shared notebook';
  const now = new Date().toISOString();
  return {
    gistId: id,
    notebook: {
      id: `shared-${id}`,
      title: title.trim(),
      cells,
      createdAt: now,
      updatedAt: now,
      gistId: id,
    },
  };
}
