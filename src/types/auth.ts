export interface LoginRequest {
  login: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user_id?: string
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
  roles: string[]
  exp: number
}

export interface RoleDto {
  id: string
  name: string
  description: string
}

export interface UserDto {
  id: string
  login: string
  name: string
  surname: string
  email: string
  roles: RoleDto[]
}
