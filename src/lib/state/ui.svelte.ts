const PREFS_KEY = 'ui-prefs-v1';

interface UiPrefs {
  sidebarCollapsed?: boolean;
}

function loadPrefs(): UiPrefs {
  try {
    const raw = globalThis.localStorage?.getItem(PREFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UiPrefs;
  } catch {
    return {};
  }
}

function savePrefs(prefs: UiPrefs): void {
  if (!globalThis.localStorage) return;
  globalThis.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

const initial = loadPrefs();
let sidebarCollapsed = $state<boolean>(initial.sidebarCollapsed ?? false);

export function isSidebarCollapsed(): boolean {
  return sidebarCollapsed;
}

export function toggleSidebar(): void {
  sidebarCollapsed = !sidebarCollapsed;
  savePrefs({ sidebarCollapsed });
}

export function setSidebarCollapsed(value: boolean): void {
  sidebarCollapsed = value;
  savePrefs({ sidebarCollapsed });
}
