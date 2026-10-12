import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

const TOKEN_KEY = 'token';
const USER_STORAGE_KEY = 'user-storage';

function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

// 用户状态接口
interface UserState {
  user: User | null; // 当前用户信息
  token: string | null; // 认证token
  isAuthenticated: boolean; // 是否已认证
  setUser: (user: User | null) => void; // 设置用户信息
  setToken: (token: string | null) => void; // 设置token
  logout: () => void; // 登出
}

// 创建用户状态store
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // 设置用户信息
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      // 设置token
      setToken: (token) => {
        if (token) {
          sessionStorage.setItem(TOKEN_KEY, token);
        } else {
          sessionStorage.removeItem(TOKEN_KEY);
        }
        set({ token, isAuthenticated: !!token });
      },

      // 登出
      logout: () => {
        clearAuthStorage();
        sessionStorage.removeItem(TOKEN_KEY);
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: USER_STORAGE_KEY, // 仅持久化非敏感用户状态
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);