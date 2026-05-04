import { api } from '../../../shared/api/httpClient'
import type { LoginRequest, LoginResponse, RegisterRequest, ValidateResponse } from '../../../types/auth'

export { decodeToken } from '../../../shared/lib/jwt'
export { refreshTokens } from '../../../shared/api/httpClient'

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  return data
}

export async function register(payload: RegisterRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/register', payload)
  return data
}

export async function validate(): Promise<ValidateResponse> {
  const { data } = await api.post<ValidateResponse>('/auth/validate')
  return data
}
