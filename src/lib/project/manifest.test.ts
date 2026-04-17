import { describe, expect, it } from 'vitest';
import { parseManifest } from './manifest';

describe('parseManifest', () => {
  it('parses a title and a list of notebooks', () => {
    const src = [
      'title: Zero Notebook Demo',
      'notebooks:',
      '  - welcome.md',
      '  - semantic-search.md',
    ].join('\n');
    expect(parseManifest(src)).toEqual({
      title: 'Zero Notebook Demo',
      notebooks: ['welcome.md', 'semantic-search.md'],
    });
  });

  it('works without a title and with comments/blank lines', () => {
    const src = [
      '# a workshop manifest',
      '',
      'notebooks:',
      '  # first',
      '  - intro.md',
      '',
      '  - exercises/first.md',
    ].join('\n');
    expect(parseManifest(src)).toEqual({
      notebooks: ['intro.md', 'exercises/first.md'],
    });
  });

  it('handles quoted values in title and list items', () => {
    const src = ['title: "Intro to TiDB"', 'notebooks:', '  - "folder/file with space.md"'].join(
      '\n',
    );
    expect(parseManifest(src)).toEqual({
      title: 'Intro to TiDB',
      notebooks: ['folder/file with space.md'],
    });
  });

  it('returns an empty list when notebooks is omitted', () => {
    expect(parseManifest('title: empty')).toEqual({ title: 'empty', notebooks: [] });
  });

  it('rejects object-form notebook entries (not yet supported)', () => {
    const src = ['notebooks:', '  - file: welcome.md', '    title: Welcome'].join('\n');
    expect(() => parseManifest(src)).toThrow(/Object-form/);
  });
});
