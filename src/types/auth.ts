export interface LoginRequest {
  login: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
}

export interface RegisterRequest {
  login: string
  password: string
  name: string
  surname: string
  email: string
}

export interface ValidateResponse {
  id: string
  login: string
  name: string
  surname: string
  email: string
  roles: string[]
}
