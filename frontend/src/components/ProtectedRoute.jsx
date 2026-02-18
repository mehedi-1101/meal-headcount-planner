import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'

export default function ProtectedRoute() {
  const { user, loading, checkSession } = useAuthStore()

  useEffect(() => {
    checkSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />

  return <Outlet />
}
