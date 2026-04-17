export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
  expiresAt: number;
}

let nextId = 1;
let toasts = $state<Toast[]>([]);

export function getToasts(): Toast[] {
  return toasts;
}

export function showToast(options: {
  message: string;
  undo?: () => void;
  durationMs?: number;
}): number {
  const id = nextId++;
  const duration = options.durationMs ?? 5000;
  const toast: Toast = {
    id,
    message: options.message,
    undo: options.undo,
    expiresAt: Date.now() + duration,
  };
  toasts = [...toasts, toast];
  setTimeout(() => dismiss(id), duration);
  return id;
}

export function dismiss(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
}
