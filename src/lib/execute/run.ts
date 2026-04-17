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
}

async function executeOne(
  query: string,
  instance: Instance,
  options: RunOptions,
): Promise<SqlResult> {
  const { host, username, password, database } = parseConnectionString(instance.connectionString);
  const res = await fetch('/api/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, username, password, database, query }),
    signal: options.signal,
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

export async function runCell(
  sql: string,
  instance: Instance,
  options: RunOptions = {},
): Promise<SqlResult> {
  const statements = splitStatements(sql);
  if (statements.length === 0) {
    throw new Error('Empty SQL');
  }
  let last: SqlResult = {};
  for (const stmt of statements) {
    last = await executeOne(stmt, instance, options);
  }
  return last;
}
