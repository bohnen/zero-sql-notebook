import type { Notebook } from '../notebook/types';

const STORAGE_KEY = 'notebooks-v1';
const ORDER_KEY = 'notebook-order-v1';
const DEBOUNCE_MS = 500;

export type NotebookMap = Record<string, Notebook>;

let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPayload: NotebookMap | null = null;
let pendingOrderTimer: ReturnType<typeof setTimeout> | null = null;
let pendingOrder: string[] | null = null;

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
  if (pendingOrderTimer !== null) clearTimeout(pendingOrderTimer);
  pendingOrderTimer = null;
  if (pendingOrder) {
    saveOrder(pendingOrder);
    pendingOrder = null;
  }
}

export function loadOrder(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(ORDER_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

export function saveOrder(ids: string[]): void {
  globalThis.localStorage?.setItem(ORDER_KEY, JSON.stringify(ids));
}

export function scheduleSaveOrder(ids: string[]): void {
  pendingOrder = ids;
  if (pendingOrderTimer !== null) clearTimeout(pendingOrderTimer);
  pendingOrderTimer = setTimeout(() => {
    if (pendingOrder) saveOrder(pendingOrder);
    pendingOrderTimer = null;
    pendingOrder = null;
  }, DEBOUNCE_MS);
}
