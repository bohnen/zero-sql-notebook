import type { Cell, CellType, Notebook } from '../notebook/types';
import { newId } from '../notebook/ids';
import { createInitialNotebook } from '../notebook/seed';
import { loadNotebooks, scheduleSave } from '../storage/store';

function pickOrCreate(): Notebook {
  const map = loadNotebooks();
  const ids = Object.keys(map);
  if (ids.length > 0) return map[ids[0]];
  return createInitialNotebook();
}

let notebook = $state<Notebook>(pickOrCreate());

export function getNotebook(): Notebook {
  return notebook;
}

export function setNotebook(next: Notebook): void {
  notebook = next;
}

export function updateNotebook(updater: (n: Notebook) => Notebook): void {
  notebook = updater(notebook);
}

export function updateCellSource(id: string, source: string): void {
  notebook = {
    ...notebook,
    cells: notebook.cells.map((c) => (c.id === id ? { ...c, source } : c)),
  };
}

export function addCell(type: CellType): void {
  const cell: Cell = { id: newId(), type, source: '' };
  notebook = { ...notebook, cells: [...notebook.cells, cell] };
}

export function removeCell(id: string): void {
  notebook = { ...notebook, cells: notebook.cells.filter((c) => c.id !== id) };
}

export function moveCell(id: string, direction: -1 | 1): void {
  const idx = notebook.cells.findIndex((c) => c.id === id);
  if (idx === -1) return;
  const target = idx + direction;
  if (target < 0 || target >= notebook.cells.length) return;
  const next = [...notebook.cells];
  [next[idx], next[target]] = [next[target], next[idx]];
  notebook = { ...notebook, cells: next };
}

export function initAutoSave(): () => void {
  const cleanup = $effect.root(() => {
    $effect(() => {
      const snapshot: Notebook = {
        ...notebook,
        cells: notebook.cells.map((c) => ({ ...c })),
        updatedAt: new Date().toISOString(),
      };
      scheduleSave({ [snapshot.id]: snapshot });
    });
  });
  return cleanup;
}
