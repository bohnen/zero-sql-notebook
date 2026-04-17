import type { Notebook } from '../notebook/types';

const STORAGE_KEY = 'notebooks-v1';
const DEBOUNCE_MS = 500;

export type NotebookMap = Record<string, Notebook>;

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPayload: NotebookMap | null = null;

export function loadNotebooks(): NotebookMap {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as NotebookMap;
  } catch {
    return {};
  }
}

export function saveNotebooks(map: NotebookMap): void {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function scheduleSave(map: NotebookMap): void {
  pendingPayload = map;
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(() => {
    if (pendingPayload) saveNotebooks(pendingPayload);
    pendingTimer = null;
    pendingPayload = null;
  }, DEBOUNCE_MS);
}

export function flushSave(): void {
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pendingTimer = null;
  if (pendingPayload) {
    saveNotebooks(pendingPayload);
    pendingPayload = null;
  }
}
