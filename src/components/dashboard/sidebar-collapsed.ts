/** Shared sidebar collapsed state (localStorage) for aside + top bar. */

const STORAGE_KEY = "cermin-sidebar-collapsed";
const collapsedListeners = new Set<() => void>();

export function getSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function subscribeSidebarCollapsed(onStoreChange: () => void): () => void {
  collapsedListeners.add(onStoreChange);
  return () => {
    collapsedListeners.delete(onStoreChange);
  };
}

export function setSidebarCollapsed(next: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  for (const listener of collapsedListeners) listener();
}
