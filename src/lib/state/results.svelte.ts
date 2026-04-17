import type { SqlResult } from '../execute/run';

export interface CellExecutionState {
  running: boolean;
  result: SqlResult | null;
  error: string | null;
  elapsedMs: number | null;
}

const INITIAL: CellExecutionState = {
  running: false,
  result: null,
  error: null,
  elapsedMs: null,
};

let executions = $state<Record<string, CellExecutionState>>({});

export function getCellExecution(cellId: string): CellExecutionState {
  return executions[cellId] ?? INITIAL;
}

export function patchCellExecution(cellId: string, patch: Partial<CellExecutionState>): void {
  const current = executions[cellId] ?? INITIAL;
  executions = { ...executions, [cellId]: { ...current, ...patch } };
}

export function resetCellExecution(cellId: string): void {
  patchCellExecution(cellId, {
    running: true,
    result: null,
    error: null,
    elapsedMs: null,
  });
}
