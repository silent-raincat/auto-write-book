import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  plan: 'free' | 'premium'
  created_at?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  setUser: (user: User | null) => void
  logout: () => void
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        set({ user, token, isAuthenticated: true })
        // 同时保存到 localStorage 用于 API 请求
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_user', JSON.stringify(user))
          localStorage.setItem('auth_token', token)
        }
      },
      setUser: (user) => {
        const token = user ? localStorage.getItem('auth_token') : null
        set({ user, isAuthenticated: Boolean(user), token })
      },
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
        }
      },
      setToken: (token) => set({ token })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated })
    }
  )
)
