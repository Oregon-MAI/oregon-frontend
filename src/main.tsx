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
import RegisterPage from './pages/RegisterPage'

<Route path="/rooms" element={
  <ProtectedRoute><MeetingRoomsPage /></ProtectedRoute>
} />

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
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
