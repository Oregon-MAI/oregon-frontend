import axios from 'axios'
import type { LoginResponse } from '../../shared/types/auth'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

/** Shared Axios instance for all gateway requests. */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  paramsSerializer: {
    indexes: null,
  },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

/** Resolves requests that waited while one refresh-token request was in flight. */
function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(token!)))
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }
      original._retry = true
      isRefreshing = true
      try {
        const newTokens = await refreshTokens()
        localStorage.setItem('access_token', newTokens.access_token)
        localStorage.setItem('refresh_token', newTokens.refresh_token)
        api.defaults.headers.common.Authorization = `Bearer ${newTokens.access_token}`
        processQueue(null, newTokens.access_token)
        original.headers.Authorization = `Bearer ${newTokens.access_token}`
        return api(original)
      } catch (err) {
        processQueue(err, null)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  },
)

/** Requests a new access/refresh token pair using the saved refresh token. */
export async function refreshTokens(): Promise<LoginResponse> {
  const refreshToken = localStorage.getItem('refresh_token')
  const url = BASE_URL.startsWith('http') ? `${BASE_URL}/auth/refresh` : `${window.location.origin}${BASE_URL}/auth/refresh`
  const { data } = await axios.post<LoginResponse>(url, null, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  })
  return data
}
