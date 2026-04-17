import { describe, expect, it } from 'vitest';
import { parseMarkdown } from './parse';
import { serialize } from './serialize';

describe('parseMarkdown', () => {
  it('parses a document with markdown + sql + env cells', () => {
    const src = [
      '# Title',
      '',
      'Intro paragraph.',
      '',
      '```sql',
      'SELECT 1;',
      '```',
      '',
      '```env',
      'FOO=bar',
      '```',
      '',
      'Tail text.',
      '',
    ].join('\n');

    const { cells, frontmatter } = parseMarkdown(src);
    expect(frontmatter).toBeNull();
    expect(cells.map((c) => c.type)).toEqual(['markdown', 'sql', 'env', 'markdown']);
    expect(cells[1].source).toBe('SELECT 1;');
    expect(cells[2].source).toBe('FOO=bar');
    expect(cells[0].source).toBe('# Title\n\nIntro paragraph.');
    expect(cells[3].source).toBe('Tail text.');
  });

  it('skips YAML frontmatter without exposing it as a markdown cell', () => {
    const src = ['---', 'title: demo', 'gist_id: abc', '---', '', 'Body.', ''].join('\n');
    const { cells, frontmatter } = parseMarkdown(src);
    expect(frontmatter).toBe('title: demo\ngist_id: abc');
    expect(cells).toHaveLength(1);
    expect(cells[0].type).toBe('markdown');
    expect(cells[0].source).toBe('Body.');
  });

  it('drops blank-only markdown gaps between fences', () => {
    const src = ['```sql', 'SELECT 1;', '```', '', '', '```env', 'K=V', '```'].join('\n');
    const { cells } = parseMarkdown(src);
    expect(cells.map((c) => c.type)).toEqual(['sql', 'env']);
  });
});

describe('serialize + parse round-trip', () => {
  it('round-trips the 3-cell sample', () => {
    const src = [
      '# Title',
      '',
      'Intro.',
      '',
      '```sql',
      'SELECT 1;',
      '```',
      '',
      '```env',
      'FOO=bar',
      '```',
    ].join('\n');
    const first = parseMarkdown(src);
    const reserialized = serialize({ cells: first.cells });
    const second = parseMarkdown(reserialized);
    expect(second.cells.map((c) => ({ type: c.type, source: c.source }))).toEqual(
      first.cells.map((c) => ({ type: c.type, source: c.source })),
    );
  });

  it('round-trips fenced-only documents', () => {
    const src = ['```sql', 'SELECT 1;', '```', '', '```env', 'K=V', '```'].join('\n');
    const first = parseMarkdown(src);
    const reserialized = serialize({ cells: first.cells });
    const second = parseMarkdown(reserialized);
    expect(second.cells.map((c) => ({ type: c.type, source: c.source }))).toEqual(
      first.cells.map((c) => ({ type: c.type, source: c.source })),
    );
  });

  it('round-trips markdown-only documents', () => {
    const src = '# Heading\n\nparagraph text with **bold**';
    const first = parseMarkdown(src);
    const reserialized = serialize({ cells: first.cells });
    const second = parseMarkdown(reserialized);
    expect(second.cells).toHaveLength(1);
    expect(second.cells[0].source).toBe(src);
  });
});
