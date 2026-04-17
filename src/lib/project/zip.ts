import { zipSync, strToU8, type Zippable } from 'fflate';
import type { Notebook } from '../notebook/types';
import { serialize } from '../notebook/serialize';
import { formatManifest } from './manifest';
import { slugify, uniqueSlug } from './slug';

export interface BuildProjectZipOptions {
  title: string;
  notebooks: Notebook[];
  /** Root folder name inside the zip. Defaults to slugify(title). */
  slug?: string;
}

export interface BuiltProjectZip {
  slug: string;
  filename: string;
  blob: Blob;
}

/**
 * Bundle a set of notebooks into a project zip matching the ?github= import
 * layout: `<slug>/project.yaml` + `<slug>/<notebook>.md`. Notebook frontmatter
 * keeps the `title` but the `gist_id` is dropped — inside a project bundle a
 * per-notebook gist link is no longer meaningful.
 */
export function buildProjectZip(options: BuildProjectZipOptions): BuiltProjectZip {
  const slug =
    options.slug && options.slug.length > 0 ? slugify(options.slug) : slugify(options.title);

  const taken = new Set<string>();
  const filenames = options.notebooks.map((nb, idx) => {
    const base = nb.title.trim() || `notebook-${idx + 1}`;
    return `${uniqueSlug(base, taken)}.md`;
  });

  const manifestYaml = formatManifest({
    title: options.title,
    notebooks: filenames,
  });

  const entries: Zippable = {
    [`${slug}/project.yaml`]: strToU8(manifestYaml),
  };
  for (let i = 0; i < options.notebooks.length; i += 1) {
    const nb = options.notebooks[i];
    const body = serialize({
      cells: nb.cells,
      meta: { title: nb.title },
    });
    entries[`${slug}/${filenames[i]}`] = strToU8(body);
  }

  const u8 = zipSync(entries, { level: 6 });
  // Copy into a fresh ArrayBuffer so Blob gets a stable backing store.
  const buffer = new Uint8Array(u8).buffer;
  return {
    slug,
    filename: `${slug}.zip`,
    blob: new Blob([buffer], { type: 'application/zip' }),
  };
}

export function downloadProjectZip(options: BuildProjectZipOptions): BuiltProjectZip {
  const built = buildProjectZip(options);
  const url = URL.createObjectURL(built.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = built.filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return built;
}
