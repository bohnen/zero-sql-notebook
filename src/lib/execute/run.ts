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

export class SqlFetchError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'SqlFetchError';
    this.status = status;
  }
}

function extractMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.error === 'string' && b.error.trim()) return b.error;
  if (typeof b.message === 'string' && b.message.trim()) return b.message;
  if (typeof b.detail === 'string' && b.detail.trim()) return b.detail;
  if (b.error && typeof b.error === 'object') {
    const nested = b.error as Record<string, unknown>;
    if (typeof nested.message === 'string' && nested.message.trim()) return nested.message;
    if (typeof nested.detail === 'string' && nested.detail.trim()) return nested.detail;
  }
  if (Array.isArray(b.errors) && b.errors.length > 0) {
    const first = b.errors[0];
    if (first && typeof first === 'object') {
      const msg = (first as Record<string, unknown>).message;
      if (typeof msg === 'string' && msg.trim()) return msg;
    } else if (typeof first === 'string' && first.trim()) {
      return first;
    }
  }
  return null;
}

function formatErrorWithStatus(message: string, status: number): string {
  // If the caller already embedded the status, don't repeat it.
  return /\b\d{3}\b/.test(message) ? message : `${message} (HTTP ${status})`;
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
  let parsed: unknown = null;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    // Keep parsed as null — fall through to raw-text handling below.
  }
  if (!res.ok) {
    const extracted = extractMessage(parsed);
    if (extracted) {
      throw new SqlFetchError(formatErrorWithStatus(extracted, res.status), res.status);
    }
    const raw = text.trim();
    if (raw) {
      throw new SqlFetchError(formatErrorWithStatus(raw.slice(0, 800), res.status), res.status);
    }
    throw new SqlFetchError(`SQL request failed (HTTP ${res.status})`, res.status);
  }
  if (parsed && typeof parsed === 'object') {
    const embeddedError = extractMessage(parsed);
    if (embeddedError) {
      throw new Error(embeddedError);
    }
    return parsed as SqlResult;
  }
  throw new Error(`Unexpected empty response from SQL endpoint`);
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
