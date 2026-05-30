import { Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/AuthContext'

/** Redirects unauthenticated users to login and optionally enforces admin access. */
export default function ProtectedRoute({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode
  requireAdmin?: boolean
}) {
  const { isLoading, isAdmin, user } = useAuth()
  const token = localStorage.getItem('access_token')

  if (isLoading) return null

  if (!token || !user) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/map" replace />
  }

  return <>{children}</>
}
