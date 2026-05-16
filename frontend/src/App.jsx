import { useState, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './views/Login.jsx'
import Signup from './views/Signup.jsx'
import ParticipantDashboard from './views/ParticipantDashboard.jsx'
import AdminDashboard from './views/AdminDashboard.jsx'
import MentorDashboard from './views/MentorDashboard.jsx'

// ── Auth Context (simple localStorage-based for hackathon) ──
const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ecolink_user')) } catch { return null }
  })

  const login = (userData) => {
    localStorage.setItem('ecolink_user', JSON.stringify(userData))
    setUser(userData)
  }
  const logout = () => {
    localStorage.removeItem('ecolink_user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

function ProtectedRoute({ children, role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#141d2e',
              color: '#f0f4ff',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '12px',
            },
          }}
        />
        <Routes>
          <Route path="/"         element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/signup"   element={<Signup />} />
          <Route path="/participant" element={
            <ProtectedRoute role="participant"><ParticipantDashboard /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/mentor" element={
            <ProtectedRoute role="mentor"><MentorDashboard /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
