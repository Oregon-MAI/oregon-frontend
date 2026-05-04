import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../features/auth/model/AuthContext'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  )
}
