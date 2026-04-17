/**
 * Slugify a free-form title for use as a filename or folder segment.
 * - lower-case
 * - strip characters that aren't word chars, spaces or hyphens
 * - collapse whitespace runs to a single hyphen
 * - collapse hyphen runs and trim them from the ends
 * - fall back to `notebook` when the result is empty
 * - truncate to a reasonable length so filenames stay sane
 */
export function slugify(title: string, fallback = 'notebook'): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || fallback;
}

/**
 * Disambiguate a slug against a set of already-used slugs. Mutates the set.
 */
export function uniqueSlug(title: string, taken: Set<string>, fallback = 'notebook'): string {
  const base = slugify(title, fallback);
  let candidate = base;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  taken.add(candidate);
  return candidate;
}
