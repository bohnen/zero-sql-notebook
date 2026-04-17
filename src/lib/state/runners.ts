export type Runner = () => Promise<boolean>;

const runners = new Map<string, Runner>();
const controllers = new Map<string, AbortController>();

export function registerRunner(id: string, fn: Runner): () => void {
  runners.set(id, fn);
  return () => {
    if (runners.get(id) === fn) runners.delete(id);
  };
}

export function getRunner(id: string): Runner | undefined {
  return runners.get(id);
}

export function registerController(id: string, controller: AbortController | null): void {
  if (controller) controllers.set(id, controller);
  else controllers.delete(id);
}

export function cancelAll(): void {
  for (const c of controllers.values()) c.abort(new DOMException('Cancelled', 'AbortError'));
  controllers.clear();
}
