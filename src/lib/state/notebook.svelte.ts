import type { Cell, CellType, Notebook } from '../notebook/types';
import { newId } from '../notebook/ids';
import { createInitialNotebook } from '../notebook/seed';
import { loadNotebooks, loadOrder, scheduleSave, scheduleSaveOrder } from '../storage/store';
import { showToast } from './toast.svelte';

const ACTIVE_ID_KEY = 'active-notebook-id-v1';

function loadActiveId(): string | null {
  return globalThis.localStorage?.getItem(ACTIVE_ID_KEY) ?? null;
}

function saveActiveId(id: string | null): void {
  if (!globalThis.localStorage) return;
  if (id) globalThis.localStorage.setItem(ACTIVE_ID_KEY, id);
  else globalThis.localStorage.removeItem(ACTIVE_ID_KEY);
}

function reconcileOrder(map: Record<string, Notebook>, stored: string[]): string[] {
  const ids = Object.keys(map);
  const seen = new Set<string>();
  const out: string[] = [];
  // Keep stored order for ids that still exist.
  for (const id of stored) {
    if (id in map && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  // Append any notebooks that aren't in the stored order (new or first-run),
  // sorted by updatedAt desc so the initial view matches the old behaviour.
  const rest = ids
    .filter((id) => !seen.has(id))
    .sort((a, b) => map[b].updatedAt.localeCompare(map[a].updatedAt));
  for (const id of rest) out.push(id);
  return out;
}

function bootstrap(): {
  notebooks: Record<string, Notebook>;
  activeId: string | null;
  order: string[];
} {
  const map = loadNotebooks();
  const ids = Object.keys(map);
  if (ids.length === 0) {
    const nb = createInitialNotebook();
    return { notebooks: { [nb.id]: nb }, activeId: nb.id, order: [nb.id] };
  }
  const stored = loadActiveId();
  const activeId = stored && map[stored] ? stored : ids[0];
  const order = reconcileOrder(map, loadOrder());
  return { notebooks: map, activeId, order };
}

const initial = bootstrap();
let notebooks = $state<Record<string, Notebook>>(initial.notebooks);
let activeId = $state<string | null>(initial.activeId);
let notebookOrder = $state<string[]>(initial.order);

function touch(n: Notebook): Notebook {
  return { ...n, updatedAt: new Date().toISOString() };
}

function updateActive(updater: (n: Notebook) => Notebook): void {
  if (!activeId) return;
  const current = notebooks[activeId];
  if (!current) return;
  const next = touch(updater(current));
  notebooks = { ...notebooks, [activeId]: next };
}

function appendOrder(id: string): void {
  if (notebookOrder.includes(id)) return;
  notebookOrder = [...notebookOrder, id];
}

function removeFromOrder(id: string): void {
  notebookOrder = notebookOrder.filter((x) => x !== id);
}

export function getNotebooks(): Record<string, Notebook> {
  return notebooks;
}

export function getNotebookOrder(): string[] {
  return notebookOrder;
}

export function getOrderedNotebooks(): Notebook[] {
  return notebookOrder.map((id) => notebooks[id]).filter((n): n is Notebook => !!n);
}

export function getActiveId(): string | null {
  return activeId;
}

export function getActiveNotebook(): Notebook | null {
  if (!activeId) return null;
  return notebooks[activeId] ?? null;
}

export function setActiveId(id: string): void {
  if (id in notebooks) activeId = id;
}

export function updateCellSource(cellId: string, source: string): void {
  updateActive((n) => ({
    ...n,
    cells: n.cells.map((c) => (c.id === cellId ? { ...c, source } : c)),
  }));
}

export function addCell(type: CellType): void {
  const cell: Cell = { id: newId(), type, source: '' };
  updateActive((n) => ({ ...n, cells: [...n.cells, cell] }));
}

export function removeCell(cellId: string): void {
  const notebookId = activeId;
  const current = notebookId ? notebooks[notebookId] : null;
  if (!current) return;
  const idx = current.cells.findIndex((c) => c.id === cellId);
  if (idx === -1) return;
  const removed = current.cells[idx];
  updateActive((n) => ({ ...n, cells: n.cells.filter((c) => c.id !== cellId) }));
  showToast({
    message: `Cell removed`,
    undo: () => {
      const nb = notebookId ? notebooks[notebookId] : null;
      if (!nb) return;
      if (nb.cells.some((c) => c.id === removed.id)) return;
      const next = [...nb.cells];
      next.splice(Math.min(idx, next.length), 0, removed);
      notebooks = { ...notebooks, [nb.id]: touch({ ...nb, cells: next }) };
    },
  });
}

export function moveCell(cellId: string, direction: -1 | 1): void {
  updateActive((n) => {
    const idx = n.cells.findIndex((c) => c.id === cellId);
    if (idx === -1) return n;
    const target = idx + direction;
    if (target < 0 || target >= n.cells.length) return n;
    const cells = [...n.cells];
    [cells[idx], cells[target]] = [cells[target], cells[idx]];
    return { ...n, cells };
  });
}

export function moveNotebook(id: string, direction: -1 | 1): void {
  const idx = notebookOrder.indexOf(id);
  if (idx === -1) return;
  const target = idx + direction;
  if (target < 0 || target >= notebookOrder.length) return;
  const next = [...notebookOrder];
  [next[idx], next[target]] = [next[target], next[idx]];
  notebookOrder = next;
}

export function createNotebook(): string {
  const now = new Date().toISOString();
  const nb: Notebook = {
    id: newId(),
    title: 'Untitled',
    cells: [],
    createdAt: now,
    updatedAt: now,
  };
  notebooks = { ...notebooks, [nb.id]: nb };
  appendOrder(nb.id);
  activeId = nb.id;
  return nb.id;
}

export function duplicateNotebook(id: string): string | null {
  const src = notebooks[id];
  if (!src) return null;
  const now = new Date().toISOString();
  const copy: Notebook = {
    id: newId(),
    title: `${src.title} (copy)`,
    cells: src.cells.map((c) => ({ ...c, id: newId() })),
    createdAt: now,
    updatedAt: now,
  };
  notebooks = { ...notebooks, [copy.id]: copy };
  // Insert right after the source for a natural "clone next to original" feel.
  const srcIdx = notebookOrder.indexOf(id);
  if (srcIdx === -1) appendOrder(copy.id);
  else {
    const next = [...notebookOrder];
    next.splice(srcIdx + 1, 0, copy.id);
    notebookOrder = next;
  }
  activeId = copy.id;
  return copy.id;
}

export function deleteNotebook(id: string): void {
  if (!(id in notebooks)) return;
  const next: Record<string, Notebook> = {};
  for (const [k, v] of Object.entries(notebooks)) if (k !== id) next[k] = v;
  notebooks = next;
  removeFromOrder(id);
  if (activeId === id) {
    if (notebookOrder.length === 0) createNotebook();
    else activeId = notebookOrder[0];
  }
}

export function renameNotebook(id: string, title: string): void {
  const nb = notebooks[id];
  if (!nb) return;
  notebooks = { ...notebooks, [id]: touch({ ...nb, title }) };
}

export function importNotebook(
  title: string,
  cells: Cell[],
  options: { gistId?: string } = {},
): string {
  const now = new Date().toISOString();
  const nb: Notebook = {
    id: newId(),
    title,
    cells: cells.map((c) => ({ ...c, id: newId() })),
    createdAt: now,
    updatedAt: now,
    gistId: options.gistId,
  };
  notebooks = { ...notebooks, [nb.id]: nb };
  appendOrder(nb.id);
  activeId = nb.id;
  return nb.id;
}

export function setGistId(notebookId: string, gistId: string | undefined): void {
  const nb = notebooks[notebookId];
  if (!nb) return;
  notebooks = { ...notebooks, [notebookId]: touch({ ...nb, gistId }) };
}

export function initAutoSave(): () => void {
  return $effect.root(() => {
    $effect(() => {
      scheduleSave(notebooks);
    });
    $effect(() => {
      saveActiveId(activeId);
    });
    $effect(() => {
      scheduleSaveOrder(notebookOrder);
    });
  });
}
