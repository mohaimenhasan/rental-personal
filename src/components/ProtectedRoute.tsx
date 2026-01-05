import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PhoneRequiredModal } from './PhoneRequiredModal'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types/database'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [checkingPhone, setCheckingPhone] = useState(true)

  useEffect(() => {
    async function checkPhone() {
      if (!user || !profile) {
        setCheckingPhone(false)
        return
      }

      // Check if profile has phone number
      if (!profile.phone) {
        // Double-check from database in case profile is stale
        const { data } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .single()

        if (!data?.phone) {
          setShowPhoneModal(true)
        }
      }
      setCheckingPhone(false)
    }

    if (!loading && user) {
      checkPhone()
    } else {
      setCheckingPhone(false)
    }
  }, [user, profile, loading])

  if (loading || checkingPhone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If profile failed to load, still allow access to basic routes
  // but redirect role-restricted routes to dashboard
  if (allowedRoles && !profile) {
    return <Navigate to="/dashboard" replace />
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <>
      {showPhoneModal && (
        <PhoneRequiredModal
          onComplete={() => {
            setShowPhoneModal(false)
            // Refresh the page to update profile
            window.location.reload()
          }}
        />
      )}
      {children}
    </>
  )
}
