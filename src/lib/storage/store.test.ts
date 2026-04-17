import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notebook } from '../notebook/types';
import { flushSave, loadNotebooks, saveNotebooks, scheduleSave } from './store';

function makeLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  } satisfies Storage;
}

const sampleNotebook = (id: string, title: string): Notebook => ({
  id,
  title,
  cells: [{ id: 'cell-1', type: 'sql', source: 'SELECT 1;' }],
  createdAt: '2026-04-17T00:00:00.000Z',
  updatedAt: '2026-04-17T00:00:00.000Z',
});

describe('storage/store', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', makeLocalStorageMock());
    vi.useFakeTimers();
  });

  it('loads empty when nothing is stored', () => {
    expect(loadNotebooks()).toEqual({});
  });

  it('saves and reloads notebooks synchronously', () => {
    const map = { a: sampleNotebook('a', 'One') };
    saveNotebooks(map);
    expect(loadNotebooks()).toEqual(map);
  });

  it('scheduleSave debounces writes until the timer fires', () => {
    const map1 = { a: sampleNotebook('a', 'v1') };
    const map2 = { a: sampleNotebook('a', 'v2') };
    scheduleSave(map1);
    scheduleSave(map2);
    expect(loadNotebooks()).toEqual({});
    vi.advanceTimersByTime(600);
    expect(loadNotebooks()).toEqual(map2);
  });

  it('flushSave writes pending payload immediately', () => {
    const map = { a: sampleNotebook('a', 'pending') };
    scheduleSave(map);
    flushSave();
    expect(loadNotebooks()).toEqual(map);
  });

  it('tolerates corrupt JSON by returning empty', () => {
    globalThis.localStorage.setItem('notebooks-v1', '{not json');
    expect(loadNotebooks()).toEqual({});
  });
});
