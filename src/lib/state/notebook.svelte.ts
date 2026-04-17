import type { Cell, CellType, Notebook } from '../notebook/types';
import { newId } from '../notebook/ids';
import { createInitialNotebook } from '../notebook/seed';
import { loadNotebooks, scheduleSave } from '../storage/store';

const ACTIVE_ID_KEY = 'active-notebook-id-v1';

function loadActiveId(): string | null {
  return globalThis.localStorage?.getItem(ACTIVE_ID_KEY) ?? null;
}

function saveActiveId(id: string | null): void {
  if (!globalThis.localStorage) return;
  if (id) globalThis.localStorage.setItem(ACTIVE_ID_KEY, id);
  else globalThis.localStorage.removeItem(ACTIVE_ID_KEY);
}

function bootstrap(): { notebooks: Record<string, Notebook>; activeId: string | null } {
  const map = loadNotebooks();
  const ids = Object.keys(map);
  if (ids.length === 0) {
    const nb = createInitialNotebook();
    return { notebooks: { [nb.id]: nb }, activeId: nb.id };
  }
  const stored = loadActiveId();
  const activeId = stored && map[stored] ? stored : ids[0];
  return { notebooks: map, activeId };
}

const initial = bootstrap();
let notebooks = $state<Record<string, Notebook>>(initial.notebooks);
let activeId = $state<string | null>(initial.activeId);

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

export function getNotebooks(): Record<string, Notebook> {
  return notebooks;
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
  updateActive((n) => ({ ...n, cells: n.cells.filter((c) => c.id !== cellId) }));
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
  activeId = copy.id;
  return copy.id;
}

export function deleteNotebook(id: string): void {
  if (!(id in notebooks)) return;
  const next: Record<string, Notebook> = {};
  for (const [k, v] of Object.entries(notebooks)) if (k !== id) next[k] = v;
  notebooks = next;
  if (activeId === id) {
    const remaining = Object.keys(next);
    if (remaining.length === 0) createNotebook();
    else activeId = remaining[0];
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
  });
}
