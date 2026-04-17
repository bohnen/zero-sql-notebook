const STORAGE_KEY = 'tidb-zero-instance-v1';
const EXPIRY_SLACK_MS = 5 * 60_000;

export interface Instance {
  connectionString: string;
  expiresAt: string;
  claimInfo?: { claimUrl?: string; zeroId?: string };
}

export interface ParsedConnection {
  host: string;
  username: string;
  password: string;
  database: string;
}

export function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now() + EXPIRY_SLACK_MS;
}

export function parseConnectionString(connStr: string): ParsedConnection {
  const url = new URL(connStr);
  return {
    host: url.hostname,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, '') || 'test',
  };
}

function readCache(): Instance | null {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Instance;
  } catch {
    return null;
  }
}

function writeCache(inst: Instance): void {
  globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(inst));
}

export async function getInstance(force = false): Promise<Instance> {
  if (!force) {
    const cached = readCache();
    if (cached && !isExpired(cached.expiresAt)) return cached;
  }

  const res = await fetch('/api/instance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to provision instance (${res.status}): ${body || res.statusText}`);
  }
  const inst = (await res.json()) as Instance;
  writeCache(inst);
  return inst;
}

export function clearInstanceCache(): void {
  globalThis.localStorage?.removeItem(STORAGE_KEY);
}
