// Isolated token persistence — swap this module to change storage strategy.
// Deliberately sessionStorage, not localStorage: localStorage is shared across every
// tab of a browser, so two tabs logged into two different accounts would silently
// collide (the second login overwrites the first tab's token). sessionStorage is
// per-tab — it survives a refresh of that tab but isn't shared with other tabs and
// clears when the tab closes, which is what lets you test two accounts at once by
// opening a second tab.
const ACCESS_KEY = 'snaply_access_token'
const REFRESH_KEY = 'snaply_refresh_token'
const USER_KEY = 'snaply_user'

export const tokenStorage = {
  getAccess: (): string | null => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(ACCESS_KEY)
  },
  getRefresh: (): string | null => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(REFRESH_KEY)
  },
  setTokens: (access: string, refresh: string): void => {
    sessionStorage.setItem(ACCESS_KEY, access)
    sessionStorage.setItem(REFRESH_KEY, refresh)
  },
  // The Zustand auth store only lives in memory — without persisting the user object
  // too, a plain page refresh keeps isAuthenticated true (token still in storage)
  // but resets `user` to null, which silently breaks anything keyed off user.id (e.g.
  // the feed's followed-authors list).
  getUser: <T>(): T | null => {
    if (typeof window === 'undefined') return null
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },
  setUser: (user: unknown): void => {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear: (): void => {
    sessionStorage.removeItem(ACCESS_KEY)
    sessionStorage.removeItem(REFRESH_KEY)
    sessionStorage.removeItem(USER_KEY)
  },
}
