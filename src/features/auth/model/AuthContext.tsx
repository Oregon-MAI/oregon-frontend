import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { getMyBookings } from '../../bookings/api/bookingApi'
import { getUser } from '../api/userApi'
import { decodeToken, refreshTokens, validate as validateSession } from '../api/authApi'
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    function clearSession() {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
    }

    async function hydrateSession() {
      try {
        let token = localStorage.getItem('access_token')
        const refreshToken = localStorage.getItem('refresh_token')

        if (!token && refreshToken) {
          const tokens = await refreshTokens()
          localStorage.setItem('access_token', tokens.access_token)
          localStorage.setItem('refresh_token', tokens.refresh_token)
          token = tokens.access_token
        }

        if (!token) {
          clearSession()
          return
        }

        const validated = await validateSession()
        const decoded = decodeToken(token)
        const userId = validated.id || decoded?.id
        const roles = validated.roles?.length ? validated.roles : (decoded?.roles ?? [])

        if (!userId) {
          clearSession()
          return
        }

        try {
          const u = await getUser(userId)
          if (!cancelled) {
            setUser({
              id: u.id,
              login: u.login,
              name: u.name,
              surname: u.surname,
              email: u.email,
              roles: u.roles.map(r => r.name),
            })
          }
        } catch {
          if (!cancelled) {
            setUser({ id: userId, login: '', name: '', surname: '', email: '', roles })
          }
        }
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void hydrateSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    getMyBookings(user.id)
      .then(setBookings)
      .catch(() => {})
  }, [user?.id])

  const isAdmin = user?.roles?.some(role => role.toLowerCase() === 'admin') ?? false

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
