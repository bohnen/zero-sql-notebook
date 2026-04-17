const GIST_BASE = 'https://api.github.com/gists';
const NOTEBOOK_FILE = 'notebook.md';

export class GistAuthError extends Error {
  constructor() {
    super('GitHub authentication is missing or expired');
    this.name = 'GistAuthError';
  }
}

export interface GistSummary {
  id: string;
  htmlUrl: string;
  description: string;
  public: boolean;
  content: string;
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `token ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function readResponse<T>(res: Response): Promise<T> {
  if (res.status === 401 || res.status === 403) throw new GistAuthError();
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error (${res.status}): ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

interface GistResponse {
  id: string;
  html_url: string;
  description: string | null;
  public: boolean;
  files: Record<string, { content?: string; filename?: string } | null>;
}

function summarize(raw: GistResponse): GistSummary {
  const file = raw.files[NOTEBOOK_FILE] ?? Object.values(raw.files).find((f) => f !== null);
  const content = file?.content ?? '';
  return {
    id: raw.id,
    htmlUrl: raw.html_url,
    description: raw.description ?? '',
    public: raw.public,
    content,
  };
}

export async function createGist(input: {
  token: string;
  title: string;
  content: string;
}): Promise<GistSummary> {
  const res = await fetch(GIST_BASE, {
    method: 'POST',
    headers: { ...authHeaders(input.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: input.title,
      public: false,
      files: {
        [NOTEBOOK_FILE]: { content: input.content },
      },
    }),
  });
  return summarize(await readResponse<GistResponse>(res));
}

export async function updateGist(input: {
  token: string;
  id: string;
  title: string;
  content: string;
}): Promise<GistSummary> {
  const res = await fetch(`${GIST_BASE}/${input.id}`, {
    method: 'PATCH',
    headers: { ...authHeaders(input.token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: input.title,
      files: {
        [NOTEBOOK_FILE]: { content: input.content, filename: NOTEBOOK_FILE },
      },
    }),
  });
  return summarize(await readResponse<GistResponse>(res));
}

export async function getGist(id: string, token?: string): Promise<GistSummary> {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) (headers as Record<string, string>).Authorization = `token ${token}`;
  const res = await fetch(`${GIST_BASE}/${id}`, { headers });
  if (res.status === 404) throw new Error('Gist not found or not accessible');
  return summarize(await readResponse<GistResponse>(res));
}
