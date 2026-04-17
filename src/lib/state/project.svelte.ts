import type { LoadedProject } from '../project/github';

let project = $state<LoadedProject | null>(null);
let activeIndex = $state<number>(0);

export function getProject(): LoadedProject | null {
  return project;
}

export function getActiveProjectIndex(): number {
  return activeIndex;
}

export function setProject(next: LoadedProject): void {
  project = next;
  activeIndex = 0;
}

export function setActiveProjectIndex(index: number): void {
  if (!project) return;
  if (index < 0 || index >= project.notebooks.length) return;
  activeIndex = index;
}

export function clearProject(): void {
  project = null;
  activeIndex = 0;
}
