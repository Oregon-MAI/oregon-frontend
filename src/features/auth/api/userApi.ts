import { api } from '../../../shared/api/httpClient'
import type { UserDto } from '../../../types/auth'

export async function getUser(id: string): Promise<UserDto> {
  const { data } = await api.get<UserDto>('/user/user', { params: { id } })
  return data
}

export async function getUsers(): Promise<UserDto[]> {
  const { data } = await api.get<UserDto[]>('/user/users')
  return data
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete('/user/delete_user', { data: { id } })
}
