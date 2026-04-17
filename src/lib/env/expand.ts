import type { Cell } from '../notebook/types';
import { parseEnv } from './parse';

export interface UndefinedRef {
  line: number;
  col: number;
  name: string;
}

export interface ExpandResult {
  text: string;
  undefined: UndefinedRef[];
}

const VAR_RE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

export function collectVariables(cells: Cell[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const cell of cells) {
    if (cell.type !== 'env') continue;
    const { values } = parseEnv(cell.source);
    for (const [k, v] of Object.entries(values)) {
      result[k] = v;
    }
  }
  return result;
}

export function expandSql(source: string, vars: Record<string, string>): ExpandResult {
  const refs: UndefinedRef[] = [];

  const text = source.replace(VAR_RE, (match, name: string, offset: number) => {
    if (name in vars) return vars[name];
    const { line, col } = locate(source, offset);
    refs.push({ line, col, name });
    return match;
  });

  return { text, undefined: refs };
}

function locate(src: string, offset: number): { line: number; col: number } {
  let line = 1;
  let col = 1;
  for (let i = 0; i < offset; i += 1) {
    if (src[i] === '\n') {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  }
  return { line, col };
}
