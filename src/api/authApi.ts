import axios from 'axios'
import type { LoginRequest, LoginResponse, RegisterRequest, ValidateResponse } from '../types/auth'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401 — try to refresh, then retry
let isRefreshing = false
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = []

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

// POST /api/v1/auth/login
export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  return data
}

// POST /api/v1/auth/register
export async function register(payload: RegisterRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/register', payload)
  return data
}

// GET /api/v1/auth/validate
export async function validate(): Promise<ValidateResponse> {
  const { data } = await api.get<ValidateResponse>('/auth/validate')
  return data
}

// GET /api/v1/auth/refresh  (sends refresh token in Authorization header)
export async function refreshTokens(): Promise<LoginResponse> {
  const refreshToken = localStorage.getItem('refresh_token')
  const { data } = await axios.get<LoginResponse>(`${BASE_URL}/auth/refresh`, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  })
  return data
}
