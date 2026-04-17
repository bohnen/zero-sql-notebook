import type { Cell } from '../notebook/types';
import { newId } from '../notebook/ids';
import { parseFrontmatter } from '../notebook/frontmatter';
import { parseMarkdown } from '../notebook/parse';
import { parseManifest, type ProjectManifest } from './manifest';

export interface GithubTarget {
  owner: string;
  repo: string;
  ref?: string;
  path?: string;
}

export interface ProjectNotebook {
  id: string;
  title: string;
  file: string;
  cells: Cell[];
}

export interface LoadedProject {
  target: Required<Pick<GithubTarget, 'owner' | 'repo'>> & {
    ref: string;
    path: string;
  };
  title: string;
  manifestUsed: boolean;
  notebooks: ProjectNotebook[];
}

const TARGET_RE = /^(?<owner>[^/]+)\/(?<repo>[^/@]+)(?:@(?<ref>[^/]+))?(?:\/(?<path>.+))?$/;

export function parseGithubParam(raw: string): GithubTarget | null {
  const match = raw.match(TARGET_RE);
  if (!match || !match.groups) return null;
  const { owner, repo, ref, path } = match.groups;
  if (!owner || !repo) return null;
  return {
    owner,
    repo,
    ref: ref && ref.length > 0 ? ref : undefined,
    path: path && path.length > 0 ? path.replace(/\/+$/, '') : undefined,
  };
}

interface ContentEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
}

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API error (${res.status}): ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

async function fetchRaw(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
  return res.text();
}

async function resolveDefaultBranch(target: GithubTarget): Promise<string> {
  interface RepoMeta {
    default_branch: string;
  }
  const meta = await fetchJson<RepoMeta>(
    `https://api.github.com/repos/${target.owner}/${target.repo}`,
  );
  return meta.default_branch || 'main';
}

async function listContents(
  target: GithubTarget,
  ref: string,
  path: string,
): Promise<ContentEntry[]> {
  const pathSegment = path ? `/${path}` : '';
  const url = `https://api.github.com/repos/${target.owner}/${target.repo}/contents${pathSegment}?ref=${encodeURIComponent(ref)}`;
  const data = await fetchJson<ContentEntry | ContentEntry[]>(url);
  if (!Array.isArray(data)) {
    throw new Error('Target path is a file; expected a directory');
  }
  return data;
}

function rawUrl(target: GithubTarget, ref: string, filePath: string): string {
  return `https://raw.githubusercontent.com/${target.owner}/${target.repo}/${encodeURIComponent(ref)}/${filePath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')}`;
}

function titleFor(file: string, source: string): string {
  const { cells, frontmatter } = parseMarkdown(source);
  const meta = parseFrontmatter(frontmatter);
  if (meta.title && meta.title.trim()) return meta.title.trim();
  const firstMd = cells.find((c) => c.type === 'markdown');
  const heading = firstMd?.source.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;
  return file.replace(/\.md$/i, '');
}

async function parseNotebookFile(
  target: GithubTarget,
  ref: string,
  filePath: string,
): Promise<ProjectNotebook> {
  const body = await fetchRaw(rawUrl(target, ref, filePath));
  const { cells } = parseMarkdown(body);
  return {
    id: newId(),
    title: titleFor(filePath.split('/').pop() ?? filePath, body),
    file: filePath,
    cells,
  };
}

export async function loadProject(target: GithubTarget): Promise<LoadedProject> {
  const ref = target.ref ?? (await resolveDefaultBranch(target));
  const basePath = target.path ?? '';
  const entries = await listContents(target, ref, basePath);

  const manifestEntry = entries.find((e) => e.type === 'file' && e.name === 'project.yaml');
  let manifest: ProjectManifest | null = null;
  if (manifestEntry) {
    const body = await fetchRaw(rawUrl(target, ref, manifestEntry.path));
    manifest = parseManifest(body);
  }

  const files: string[] = manifest?.notebooks.length
    ? manifest.notebooks.map((n) => (basePath ? `${basePath}/${n}` : n))
    : entries
        .filter(
          (e) =>
            e.type === 'file' &&
            e.name.toLowerCase().endsWith('.md') &&
            e.name.toLowerCase() !== 'readme.md',
        )
        .map((e) => e.path)
        .sort(naturalCompare);

  const notebooks = await Promise.all(files.map((f) => parseNotebookFile(target, ref, f)));
  const title = manifest?.title?.trim() || target.repo;

  return {
    target: { owner: target.owner, repo: target.repo, ref, path: basePath },
    title,
    manifestUsed: !!manifest,
    notebooks,
  };
}
