import { create } from 'zustand'
import { tokenStorage } from './token'

export interface AuthUser {
  id: string
  username: string
  email: string
  bio: string
  avatar_url: string
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: tokenStorage.getAccess(),
  refreshToken: tokenStorage.getRefresh(),
  isAuthenticated: !!tokenStorage.getAccess(),

  login: (user, accessToken, refreshToken) => {
    tokenStorage.setTokens(accessToken, refreshToken)
    set({ user, accessToken, refreshToken, isAuthenticated: true })
  },

  logout: () => {
    tokenStorage.clear()
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
  },

  setTokens: (accessToken, refreshToken) => {
    tokenStorage.setTokens(accessToken, refreshToken)
    set({ accessToken, refreshToken })
  },
}))
