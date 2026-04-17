import type { Cell } from '../notebook/types';
import { collectVariables, expandSql, type UndefinedRef } from '../env/expand';
import { parseConnectionString, type Instance } from '../instance/client';
import { splitStatements } from './split';

export interface SqlColumn {
  name: string;
  type: string;
  nullable?: boolean;
}

export interface SqlResult {
  types?: SqlColumn[];
  rows?: unknown[][];
  rowsAffected?: number;
  lastInsertID?: number | string;
  lastInsertId?: number | string;
  error?: string;
}

export interface RunOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export class UndefinedVariableError extends Error {
  readonly refs: UndefinedRef[];
  constructor(refs: UndefinedRef[]) {
    super(`Undefined variable${refs.length > 1 ? 's' : ''}: ${refs.map((r) => r.name).join(', ')}`);
    this.name = 'UndefinedVariableError';
    this.refs = refs;
  }
}

async function executeOne(
  query: string,
  instance: Instance,
  database: string,
  signal: AbortSignal,
): Promise<SqlResult> {
  const { host, username, password } = parseConnectionString(instance.connectionString);
  const res = await fetch('/api/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, username, password, database, query }),
    signal,
  });
  const text = await res.text();
  let parsed: SqlResult = {};
  try {
    parsed = JSON.parse(text) as SqlResult;
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    const message = parsed.error ?? `SQL request failed (${res.status})`;
    throw new Error(message);
  }
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  return parsed;
}

export interface RunCellInput {
  source: string;
  cells: Cell[];
  instance: Instance;
}

export async function runCell(input: RunCellInput, options: RunOptions = {}): Promise<SqlResult> {
  const vars = collectVariables(input.cells);
  const expansion = expandSql(input.source, vars);
  if (expansion.undefined.length > 0) {
    throw new UndefinedVariableError(expansion.undefined);
  }

  const statements = splitStatements(expansion.text);
  if (statements.length === 0) {
    throw new Error('Empty SQL');
  }

  const controller = new AbortController();
  const external = options.signal;
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener('abort', () => controller.abort(external.reason));
  }
  const timeoutMs = options.timeoutMs ?? 30_000;
  const timer = setTimeout(
    () => controller.abort(new DOMException('Timeout', 'TimeoutError')),
    timeoutMs,
  );

  const database = vars.DATABASE ?? 'test';

  try {
    let last: SqlResult = {};
    for (const stmt of statements) {
      last = await executeOne(stmt, input.instance, database, controller.signal);
    }
    return last;
  } finally {
    clearTimeout(timer);
  }
}
