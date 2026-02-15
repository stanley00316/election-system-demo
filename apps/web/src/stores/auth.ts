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
  setAuth: (user: User, token: string) => void;
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
      setAuth: (user, token) => {
        api.setToken(token);
        set({ user, token, isAuthenticated: true, isLoading: false });
      },
      logout: () => {
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
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
