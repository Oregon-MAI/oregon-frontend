import { api } from '../../../shared/api/httpClient'
import type { LoginRequest, LoginResponse, RegisterRequest, ValidateResponse } from '../../../shared/types/auth'

export { decodeToken } from '../../../shared/lib/jwt'
export { refreshTokens } from '../../../shared/api/httpClient'

/** Authenticates a user and returns access/refresh tokens. */
export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  return data
}

/** Creates a user account and returns the initial token pair. */
export async function register(payload: RegisterRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/register', payload)
  return data
}

/** Validates the current access token and returns session claims from the backend. */
export async function validate(): Promise<ValidateResponse> {
  const { data } = await api.post<ValidateResponse>('/auth/validate')
  return data
}
