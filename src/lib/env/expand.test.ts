import { describe, expect, it } from 'vitest';
import type { Cell } from '../notebook/types';
import { collectVariables, expandSql } from './expand';

function envCell(source: string): Cell {
  return { id: Math.random().toString(), type: 'env', source };
}
function sqlCell(source: string): Cell {
  return { id: Math.random().toString(), type: 'sql', source };
}
function mdCell(source: string): Cell {
  return { id: Math.random().toString(), type: 'markdown', source };
}

describe('collectVariables', () => {
  it('merges env cells in document order with later cells winning', () => {
    const cells: Cell[] = [envCell('A=1\nB=2'), mdCell('irrelevant'), envCell('B=20\nC=30')];
    expect(collectVariables(cells)).toEqual({ A: '1', B: '20', C: '30' });
  });

  it('ignores non-env cells', () => {
    expect(collectVariables([sqlCell('SELECT 1')])).toEqual({});
  });

  it('skips invalid env lines but keeps valid ones', () => {
    const cells: Cell[] = [envCell('GOOD=1\nbad-line\nALSO=2')];
    expect(collectVariables(cells)).toEqual({ GOOD: '1', ALSO: '2' });
  });
});

describe('expandSql', () => {
  it('replaces ${VAR} with the value when present', () => {
    const result = expandSql('SELECT * FROM ${TBL};', { TBL: 'users' });
    expect(result.text).toBe('SELECT * FROM users;');
    expect(result.undefined).toEqual([]);
  });

  it('reports undefined ${VAR} with line and column positions', () => {
    const src = 'SELECT *\nFROM ${MISSING}\nWHERE 1=1';
    const result = expandSql(src, {});
    expect(result.text).toBe(src);
    expect(result.undefined).toEqual([{ line: 2, col: 6, name: 'MISSING' }]);
  });

  it('leaves non-matching patterns untouched (${1bad} passes through)', () => {
    const src = 'SELECT ${1bad};';
    const result = expandSql(src, {});
    expect(result.text).toBe(src);
    expect(result.undefined).toEqual([]);
  });

  it('does not treat $ outside ${...} as special', () => {
    const src = 'SELECT $a, "$b";';
    expect(expandSql(src, { a: 'X' }).text).toBe(src);
  });
});
