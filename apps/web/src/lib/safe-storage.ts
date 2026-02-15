import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Safari-safe localStorage 包裝
 *
 * Safari 在以下情境可能阻斷 localStorage 存取：
 * - 私密瀏覽模式（較舊版本會拋出 QuotaExceededError）
 * - Intelligent Tracking Prevention (ITP) 限制
 * - 使用者手動關閉網站資料儲存
 *
 * 此包裝在 localStorage 不可用時自動降級為 in-memory storage，
 * 確保 zustand persist middleware 不會因 storage 錯誤而中斷。
 */

const memoryStore = new Map<string, string>();

const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name);
    } catch {
      return memoryStore.get(name) ?? null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value);
    } catch {
      memoryStore.set(name, value);
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
    } catch {
      memoryStore.delete(name);
    }
  },
};

export const safePersistStorage = createJSONStorage(() => safeStorage);
