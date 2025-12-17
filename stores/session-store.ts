import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionState, UserRole } from '@/types'

interface SessionStore extends SessionState {
  // Actions
  setUser: (user: SessionState['user']) => void
  setExpiresAt: (expiresAt: Date) => void
  logout: () => void
  isExpired: () => boolean
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      expiresAt: undefined,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user
        })
      },

      setExpiresAt: (expiresAt) => {
        set({ expiresAt })
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          expiresAt: undefined
        })
      },

      isExpired: () => {
        const { expiresAt } = get()
        if (!expiresAt) return false
        return new Date() > expiresAt
      }
    }),
    {
      name: 'pos-session-storage',
    }
  )
)

