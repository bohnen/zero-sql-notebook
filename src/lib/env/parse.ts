export interface EnvParseError {
  line: number;
  reason: string;
}

export interface EnvParseResult {
  values: Record<string, string>;
  errors: EnvParseError[];
}

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function parseEnv(source: string): EnvParseResult {
  const values: Record<string, string> = {};
  const errors: EnvParseError[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const stripped = raw.trimStart();
    if (stripped === '' || stripped.startsWith('#')) continue;

    const eq = raw.indexOf('=');
    if (eq === -1) {
      errors.push({ line: i + 1, reason: 'missing "="' });
      continue;
    }

    const key = raw.slice(0, eq);
    if (!KEY_RE.test(key)) {
      errors.push({ line: i + 1, reason: `invalid key "${key}"` });
      continue;
    }

    const rhs = raw.slice(eq + 1);
    const parsed = parseValue(rhs);
    if (parsed.error) {
      errors.push({ line: i + 1, reason: parsed.error });
      continue;
    }
    values[key] = parsed.value;
  }

  return { values, errors };
}

interface ValueResult {
  value: string;
  error?: string;
}

function parseValue(rhs: string): ValueResult {
  if (rhs.startsWith('"')) return parseQuoted(rhs);
  return { value: stripInlineComment(rhs).trim() };
}

function stripInlineComment(src: string): string {
  const hash = src.indexOf('#');
  if (hash === -1) return src;
  const before = src.slice(0, hash);
  if (before.length === 0 || /\s$/.test(before)) return before;
  return src;
}

function parseQuoted(rhs: string): ValueResult {
  let out = '';
  let i = 1;
  while (i < rhs.length) {
    const ch = rhs[i];
    if (ch === '"') {
      const trailing = rhs.slice(i + 1);
      if (trailing.trim() !== '' && !trailing.trimStart().startsWith('#')) {
        return { value: '', error: 'unexpected content after closing quote' };
      }
      return { value: out };
    }
    if (ch === '\\') {
      const next = rhs[i + 1];
      switch (next) {
        case 'n':
          out += '\n';
          break;
        case 't':
          out += '\t';
          break;
        case '\\':
          out += '\\';
          break;
        case '"':
          out += '"';
          break;
        default:
          return { value: '', error: `invalid escape \\${next ?? ''}` };
      }
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return { value: '', error: 'unterminated double-quoted value' };
}
