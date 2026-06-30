// Isolated token persistence — swap this module to change storage strategy
const ACCESS_KEY = 'snaply_access_token'
const REFRESH_KEY = 'snaply_refresh_token'

export const tokenStorage = {
  getAccess: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ACCESS_KEY)
  },
  getRefresh: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(REFRESH_KEY)
  },
  setTokens: (access: string, refresh: string): void => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: (): void => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}
