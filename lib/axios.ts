import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { tokenStorage } from './token'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const processQueue = (err: unknown, token: string | null) => {
  failedQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)))
  failedQueue = []
}

// On 401: refresh once, then retry. On second 401: redirect to /login.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const refreshToken = tokenStorage.getRefresh()
    if (!refreshToken) {
      redirectToLogin()
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          },
          reject,
        })
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
        refresh_token: refreshToken,
      })
      const newAccess: string = data.access_token
      const newRefresh: string = data.refresh_token

      tokenStorage.setTokens(newAccess, newRefresh)
      // Update the Zustand store without creating a circular import
      // The store reads from tokenStorage on next render — tokens are already persisted
      api.defaults.headers.common.Authorization = `Bearer ${newAccess}`
      original.headers.Authorization = `Bearer ${newAccess}`

      processQueue(null, newAccess)
      return api(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      tokenStorage.clear()
      redirectToLogin()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

function redirectToLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

export default api
