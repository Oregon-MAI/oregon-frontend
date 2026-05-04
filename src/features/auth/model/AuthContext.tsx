import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { getMyBookings } from '../../bookings/api/bookingApi'
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setIsLoading(false)
      return
    }

    const decoded = decodeToken(token)
    if (decoded?.id) {
      getUser(decoded.id)
        .then(u => setUser({ id: u.id, login: u.login, name: u.name, surname: u.surname, email: u.email, roles: u.roles.map(r => r.name) }))
        .catch(() => setUser({ id: decoded.id, login: '', name: '', surname: '', email: '', roles: decoded.roles }))
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    getMyBookings(user.id)
      .then(setBookings)
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
