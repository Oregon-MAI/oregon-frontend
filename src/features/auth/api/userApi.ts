import { api } from '../../../shared/api/httpClient'
import type { UserDto } from '../../../shared/types/auth'

/** Loads a user profile by backend user id. */
export async function getUser(id: string): Promise<UserDto> {
  const { data } = await api.get<UserDto>('/user/user', { params: { id } })
  return data
}

/** Loads all users for the admin users screen. */
export async function getUsers(): Promise<UserDto[]> {
  const { data } = await api.get<UserDto[]>('/user/users')
  return data
}

/** Deletes a user account by id. */
export async function deleteUser(id: string): Promise<void> {
  await api.delete('/user/delete_user', { data: { id } })
}
