import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { safePersistStorage } from '@/lib/safe-storage';

interface User {
  id: string;
  lineUserId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  consentAcceptedAt?: string | null;
  consentVersion?: string | null;
  portraitConsentAcceptedAt?: string | null;
  promoter?: {
    id: string;
    status: string;
    isActive: boolean;
  } | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // 2FA 暫存狀態
  tempToken: string | null;
  pendingUser: User | null;
  pending2faRedirect: string | null;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  setTempAuth: (tempToken: string, user: User, redirectPath: string) => void;
  clearTempAuth: () => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      tempToken: null,
      pendingUser: null,
      pending2faRedirect: null,
      setAuth: (user, token) => {
        api.setToken(token);
        set({
          user, token, isAuthenticated: true, isLoading: false,
          tempToken: null, pendingUser: null, pending2faRedirect: null,
        });
      },
      setUser: (user) => set({ user }),
      setTempAuth: (tempToken, user, redirectPath) => {
        set({ tempToken, pendingUser: user, pending2faRedirect: redirectPath, isLoading: false });
      },
      clearTempAuth: () => {
        set({ tempToken: null, pendingUser: null, pending2faRedirect: null });
      },
      logout: () => {
        api.setToken(null);
        set({
          user: null, token: null, isAuthenticated: false, isLoading: false,
          tempToken: null, pendingUser: null, pending2faRedirect: null,
        });
      },
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      storage: safePersistStorage,
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          api.setToken(state.token);
          // 使用 store 的 setState 而非直接突變，確保觸發 re-render
          useAuthStore.setState({ isAuthenticated: true, isLoading: false });
        } else {
          useAuthStore.setState({ isLoading: false });
        }
      },
    }
  )
);
