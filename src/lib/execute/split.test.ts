import { describe, expect, it } from 'vitest';
import { splitStatements } from './split';

describe('splitStatements', () => {
  it('returns a single statement when no semicolons are present', () => {
    expect(splitStatements('SELECT 1')).toEqual(['SELECT 1']);
  });

  it('splits on semicolons and trims whitespace', () => {
    expect(splitStatements('SELECT 1;SELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('ignores trailing and empty statements', () => {
    expect(splitStatements(';;  SELECT 1;  ;SELECT 2;;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('strips -- line comments before splitting', () => {
    const src = '-- comment\nSELECT 1;\n-- another\nSELECT 2;';
    expect(splitStatements(src)).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('returns empty array for blank input', () => {
    expect(splitStatements('   \n  ')).toEqual([]);
  });
});
