import { Navigate, Outlet } from 'react-router'
import type { Role } from '../api/types'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return <Outlet />
}