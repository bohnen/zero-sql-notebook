import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('lower-cases and hyphenates spaces', () => {
    expect(slugify('Zero Notebook Demo')).toBe('zero-notebook-demo');
  });

  it('strips punctuation that would be awkward in filenames', () => {
    expect(slugify('Hello, World! / Notes?')).toBe('hello-world-notes');
  });

  it('collapses runs of whitespace and hyphens', () => {
    expect(slugify('  a   b  -  c ')).toBe('a-b-c');
  });

  it('falls back when the input has no slug-able chars', () => {
    expect(slugify('...')).toBe('notebook');
    expect(slugify('')).toBe('notebook');
  });

  it('truncates very long titles', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

describe('uniqueSlug', () => {
  it('suffixes duplicates with -2, -3 ...', () => {
    const taken = new Set<string>();
    expect(uniqueSlug('Notes', taken)).toBe('notes');
    expect(uniqueSlug('Notes', taken)).toBe('notes-2');
    expect(uniqueSlug('Notes', taken)).toBe('notes-3');
    expect(taken).toEqual(new Set(['notes', 'notes-2', 'notes-3']));
  });
});
