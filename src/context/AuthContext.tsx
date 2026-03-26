import { createContext, useContext, useState, useEffect } from 'react'
import type { Booking } from '../types/map'
import { validate } from '../api/authApi'

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
  setBookings: (bookings: Booking[]) => void
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

    validate()
      .then(data => {
        if (data?.id && data?.login) setUser(data)
        else {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        }
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
      })
      .finally(() => setIsLoading(false))
  }, [])

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
