import type { Instance } from '../instance/client';
import { clearInstanceCache, getInstance } from '../instance/client';

let instance = $state<Instance | null>(null);
let reprovisioning = $state(false);
let lastError = $state<string | null>(null);

export function getCurrentInstance(): Instance | null {
  return instance;
}

export function setInstance(next: Instance | null): void {
  instance = next;
}

export function isReprovisioning(): boolean {
  return reprovisioning;
}

export function getLastError(): string | null {
  return lastError;
}

export async function ensureInstance(): Promise<Instance> {
  try {
    const next = await getInstance(false);
    instance = next;
    lastError = null;
    return next;
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    throw err;
  }
}

export async function reprovisionInstance(): Promise<Instance> {
  reprovisioning = true;
  try {
    clearInstanceCache();
    const next = await getInstance(true);
    instance = next;
    lastError = null;
    return next;
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    reprovisioning = false;
  }
}
