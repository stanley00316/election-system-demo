import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * OWASP A07: 使用 sessionStorage 取代 localStorage
 * sessionStorage 在分頁關閉時自動清除，降低 XSS 竊取 token 的風險
 *
 * Safari-safe 包裝：在 sessionStorage 不可用時降級為 in-memory storage
 */

const memoryStore = new Map<string, string>();

const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      // 優先讀取 sessionStorage，向後相容從 localStorage 遷移
      const value = sessionStorage.getItem(name);
      if (value) return value;
      // 遷移舊 localStorage 資料
      const legacy = localStorage.getItem(name);
      if (legacy) {
        sessionStorage.setItem(name, legacy);
        localStorage.removeItem(name);
        return legacy;
      }
      return null;
    } catch {
      return memoryStore.get(name) ?? null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      sessionStorage.setItem(name, value);
      // 清除舊的 localStorage 資料
      try { localStorage.removeItem(name); } catch { /* ignore */ }
    } catch {
      memoryStore.set(name, value);
    }
  },
  removeItem: (name: string): void => {
    try {
      sessionStorage.removeItem(name);
      localStorage.removeItem(name);
    } catch {
      memoryStore.delete(name);
    }
  },
};

export const safePersistStorage = createJSONStorage(() => safeStorage);
