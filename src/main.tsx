import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import ProtectedRoute from './components/ProtectedRoute'
import './index.css'
import MeetingRoomsPage from './pages/MeetingRoomsPage'
import EquipmentPage from './pages/EquipmentPage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminWorkspacesPage from './pages/admin/AdminWorkspacesPage'
import AdminRoomsPage from './pages/admin/AdminRoomsPage'
import AdminEquipmentPage from './pages/admin/AdminEquipmentPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import BookingsPage from './pages/BookingsPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/map" element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          } />
          <Route path="/rooms" element={
            <ProtectedRoute><MeetingRoomsPage /></ProtectedRoute>
          } />
          <Route path="/equipment" element={
            <ProtectedRoute><EquipmentPage /></ProtectedRoute>
          } />
          <Route path="/bookings" element={
            <ProtectedRoute><BookingsPage /></ProtectedRoute>
          } />
<Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminWorkspacesPage />} />
            <Route path="workspaces" element={<AdminWorkspacesPage />} />
            <Route path="rooms" element={<AdminRoomsPage />} />
            <Route path="equipment" element={<AdminEquipmentPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
