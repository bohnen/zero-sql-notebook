import { describe, expect, it } from 'vitest';
import { parseGithubParam } from './github';

describe('parseGithubParam', () => {
  it('parses owner/repo only', () => {
    expect(parseGithubParam('bohnen/zero')).toEqual({
      owner: 'bohnen',
      repo: 'zero',
      ref: undefined,
      path: undefined,
    });
  });

  it('parses owner/repo@ref', () => {
    expect(parseGithubParam('tadapin/zero-notebook-example@main')).toEqual({
      owner: 'tadapin',
      repo: 'zero-notebook-example',
      ref: 'main',
      path: undefined,
    });
  });

  it('parses owner/repo/path', () => {
    expect(parseGithubParam('tadapin/zero-notebook-example/chapter1')).toEqual({
      owner: 'tadapin',
      repo: 'zero-notebook-example',
      ref: undefined,
      path: 'chapter1',
    });
  });

  it('parses owner/repo@ref/path', () => {
    expect(parseGithubParam('tadapin/zero-notebook-example@v1/chapter1/intro')).toEqual({
      owner: 'tadapin',
      repo: 'zero-notebook-example',
      ref: 'v1',
      path: 'chapter1/intro',
    });
  });

  it('returns null for malformed input', () => {
    expect(parseGithubParam('not-a-repo')).toBeNull();
    expect(parseGithubParam('')).toBeNull();
  });
});
