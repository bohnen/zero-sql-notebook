export interface ProjectManifest {
  title?: string;
  notebooks: string[];
}

/**
 * Minimal YAML parser for project.yaml files. Supports only:
 *   - `key: value` scalar entries (title, etc.)
 *   - `notebooks:` followed by a list of string items prefixed with `- `
 *
 * Object-form entries (e.g. `- file: foo.md`) are rejected with a descriptive
 * error so we can add richer parsing later without silently dropping data.
 */
export function parseManifest(source: string): ProjectManifest {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const manifest: ProjectManifest = { notebooks: [] };

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed === '' || trimmed.startsWith('#')) {
      i += 1;
      continue;
    }

    const keyMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!keyMatch) {
      throw new Error(`Unexpected line ${i + 1}: ${trimmed}`);
    }
    const key = keyMatch[1];
    const rest = keyMatch[2];

    if (key === 'notebooks') {
      if (rest.length > 0 && rest.trim() !== '') {
        throw new Error(
          `\`notebooks\` must be a block list of files; inline value not supported (line ${i + 1})`,
        );
      }
      i += 1;
      while (i < lines.length) {
        const itemRaw = lines[i];
        const itemTrim = itemRaw.trim();
        if (itemTrim === '' || itemTrim.startsWith('#')) {
          i += 1;
          continue;
        }
        // Another top-level key means the list is done.
        if (/^[A-Za-z_]/.test(itemRaw)) break;
        const itemMatch = itemRaw.match(/^\s+-\s*(.+)$/);
        if (!itemMatch) {
          throw new Error(`Expected "- <file>" inside notebooks (line ${i + 1})`);
        }
        const value = itemMatch[1].trim();
        if (value.includes(':')) {
          throw new Error(`Object-form notebook entries are not supported yet (line ${i + 1})`);
        }
        manifest.notebooks.push(unquote(value));
        i += 1;
      }
      continue;
    }

    if (key === 'title') {
      manifest.title = unquote(rest.trim());
    }
    // Silently ignore unknown scalar keys so the manifest can evolve.
    i += 1;
  }

  return manifest;
}

function unquote(raw: string): string {
  if (raw.length >= 2) {
    if (raw.startsWith('"') && raw.endsWith('"')) {
      return raw.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
    if (raw.startsWith("'") && raw.endsWith("'")) {
      return raw.slice(1, -1).replace(/''/g, "'");
    }
  }
  return raw;
}
