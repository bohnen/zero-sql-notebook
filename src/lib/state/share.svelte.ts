import type { Notebook } from '../notebook/types';

let shared = $state<{ notebook: Notebook; gistId: string; ownedByMe: boolean } | null>(null);

export function getShared(): { notebook: Notebook; gistId: string; ownedByMe: boolean } | null {
  return shared;
}

export function setShared(next: { notebook: Notebook; gistId: string; ownedByMe: boolean }): void {
  shared = next;
}

export function clearShared(): void {
  shared = null;
}
