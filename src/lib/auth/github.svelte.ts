export interface GithubAuth {
  accessToken: string;
  scope: string;
  obtainedAt: string;
}

export type PendingAction =
  | { kind: 'share'; notebookId: string }
  | { kind: 'update'; notebookId: string };

const TOKEN_KEY = 'github-oauth-v1';
const STATE_KEY = 'github-oauth-state-v1';
const PENDING_KEY = 'github-oauth-pending-v1';
const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';

function loadFromStorage(): GithubAuth | null {
  try {
    const raw = globalThis.localStorage?.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GithubAuth;
  } catch {
    return null;
  }
}

function saveToStorage(auth: GithubAuth | null): void {
  if (!globalThis.localStorage) return;
  if (auth) globalThis.localStorage.setItem(TOKEN_KEY, JSON.stringify(auth));
  else globalThis.localStorage.removeItem(TOKEN_KEY);
}

let auth = $state<GithubAuth | null>(loadFromStorage());

export function getAuth(): GithubAuth | null {
  return auth;
}

export function isAuthenticated(): boolean {
  return auth !== null;
}

export function logout(): void {
  auth = null;
  saveToStorage(null);
}

let cachedClientId: string | null | undefined;

async function fetchClientId(): Promise<string | null> {
  if (cachedClientId !== undefined) return cachedClientId;
  try {
    const res = await fetch('/api/oauth/config');
    if (!res.ok) {
      cachedClientId = null;
      return null;
    }
    const data = (await res.json()) as { clientId?: string | null };
    cachedClientId = data.clientId ?? null;
    return cachedClientId;
  } catch {
    cachedClientId = null;
    return null;
  }
}

export async function getClientId(): Promise<string | null> {
  return fetchClientId();
}

function randomState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function initiateLogin(pending?: PendingAction): Promise<void> {
  const clientId = await fetchClientId();
  if (!clientId) {
    throw new Error('GitHub OAuth is not configured on this deploy (set GITHUB_OAUTH_CLIENT_ID)');
  }
  const state = randomState();
  sessionStorage.setItem(STATE_KEY, state);
  if (pending) sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  else sessionStorage.removeItem(PENDING_KEY);

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'gist',
    redirect_uri: window.location.origin + '/',
    state,
  });
  window.location.assign(`${AUTHORIZE_URL}?${params.toString()}`);
}

export interface CallbackResult {
  auth: GithubAuth;
  pending: PendingAction | null;
}

export async function handleCallbackIfPresent(): Promise<CallbackResult | null> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return null;

  const stored = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  const pendingRaw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);

  // clean query string from URL regardless of outcome
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());

  if (!stored || stored !== state) {
    throw new Error('OAuth state mismatch');
  }

  const res = await fetch('/api/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Token exchange failed (${res.status})`);
  }
  const data = (await res.json()) as { access_token: string; scope: string };
  const next: GithubAuth = {
    accessToken: data.access_token,
    scope: data.scope,
    obtainedAt: new Date().toISOString(),
  };
  auth = next;
  saveToStorage(next);

  let pending: PendingAction | null = null;
  if (pendingRaw) {
    try {
      pending = JSON.parse(pendingRaw) as PendingAction;
    } catch {
      pending = null;
    }
  }
  return { auth: next, pending };
}
