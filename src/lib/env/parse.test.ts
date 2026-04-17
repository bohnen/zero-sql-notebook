import { describe, expect, it } from 'vitest';
import { parseEnv } from './parse';

describe('parseEnv', () => {
  it('parses bare KEY=VALUE pairs and trims surrounding whitespace', () => {
    const { values, errors } = parseEnv('FOO=bar\nBAZ=  qux  ');
    expect(values).toEqual({ FOO: 'bar', BAZ: 'qux' });
    expect(errors).toEqual([]);
  });

  it('ignores blank lines and # comments', () => {
    const { values } = parseEnv('\n# comment\nA=1\n   # indented\nB=2');
    expect(values).toEqual({ A: '1', B: '2' });
  });

  it('handles double-quoted values with embedded escapes', () => {
    const { values } = parseEnv('A="hello\\nworld"\nB="a\\tb"\nC="\\\\path"\nD="q\\"q"');
    expect(values).toEqual({ A: 'hello\nworld', B: 'a\tb', C: '\\path', D: 'q"q' });
  });

  it('preserves surrounding spaces inside double quotes', () => {
    const { values } = parseEnv('A="  spaced  "');
    expect(values).toEqual({ A: '  spaced  ' });
  });

  it('strips trailing inline comment only when preceded by whitespace', () => {
    const { values } = parseEnv('A=value # comment\nB=val#not-comment');
    expect(values).toEqual({ A: 'value', B: 'val#not-comment' });
  });

  it('reports unterminated quotes', () => {
    const { values, errors } = parseEnv('A="open');
    expect(values).toEqual({});
    expect(errors).toEqual([{ line: 1, reason: 'unterminated double-quoted value' }]);
  });

  it('reports invalid keys and missing equals sign', () => {
    const { values, errors } = parseEnv('1bad=x\nno-eq');
    expect(values).toEqual({});
    expect(errors).toHaveLength(2);
    expect(errors[0].line).toBe(1);
    expect(errors[1].line).toBe(2);
  });

  it('keeps parsing after an error line', () => {
    const { values, errors } = parseEnv('BAD\nOK=good');
    expect(values).toEqual({ OK: 'good' });
    expect(errors).toHaveLength(1);
  });
});
