import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import AdminEquipmentPage from '../pages/admin/AdminEquipmentPage'
import AdminLayout from '../pages/admin/AdminLayout'
import AdminRoomsPage from '../pages/admin/AdminRoomsPage'
import AdminUsersPage from '../pages/admin/AdminUsersPage'
import AdminWorkspacesPage from '../pages/admin/AdminWorkspacesPage'
import BookingsPage from '../pages/BookingsPage'
import EquipmentPage from '../pages/EquipmentPage'
import LoginPage from '../pages/LoginPage'
import MapPage from '../pages/MapPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
      <Route path="/equipment" element={<ProtectedRoute><EquipmentPage /></ProtectedRoute>} />
      <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminWorkspacesPage />} />
        <Route path="workspaces" element={<AdminWorkspacesPage />} />
        <Route path="rooms" element={<AdminRoomsPage />} />
        <Route path="equipment" element={<AdminEquipmentPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>
      <Route path="*" element={<LoginPage />} />
    </Routes>
  )
}
