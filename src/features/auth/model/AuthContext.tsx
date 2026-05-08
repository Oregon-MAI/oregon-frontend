import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { getMyBookings } from '../../bookings/api/bookingApi'
import { getResourcesList } from '../../resources/api/resourceApi'
import { isResourceBlocked } from '../../resources/lib/resourceStatus'
import { getUser } from '../api/userApi'
import { decodeToken } from '../api/authApi'
import type { Booking } from '../../../types/map'

export interface User {
  id: string
  login: string
  name: string
  surname: string
  email: string
  roles: string[]
}

interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
  bookings: Booking[]
  setBookings: Dispatch<SetStateAction<Booking[]>>
  isAdmin: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function normalizeRoles(roles: string[]): string[] {
  return roles.map(role => role.toUpperCase())
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadUser() {
      const token = localStorage.getItem('access_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      const decoded = decodeToken(token)
      if (!decoded?.id) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (active) setIsLoading(false)
        return
      }

      try {
        const u = await getUser(decoded.id)
        if (active) {
          setUser({ id: u.id, login: u.login, name: u.name, surname: u.surname, email: u.email, roles: normalizeRoles(u.roles.map(r => r.name)) })
        }
      } catch {
        if (active) {
          setUser({ id: decoded.id, login: '', name: '', surname: '', email: '', roles: normalizeRoles(decoded.roles) })
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadUser()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    Promise.all([getMyBookings(user.id), getResourcesList()])
      .then(([list, resources]) => {
        const resourceById = new Map(resources.map(resource => [resource.resource_id, resource]))
        setBookings(list.filter(booking => !isResourceBlocked(resourceById.get(booking.resourceId))))
      })
      .catch(() => {})
  }, [user?.id])

  const isAdmin = user?.roles?.includes('ADMIN') ?? false

  return (
    <AuthContext.Provider value={{ user, setUser, bookings, setBookings, isAdmin, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
