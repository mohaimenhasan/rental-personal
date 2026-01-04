import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useUpdateProfile } from '../hooks/useProfiles'
import { useLeases } from '../hooks/useLeases'
import toast from 'react-hot-toast'
import {
  User,
  Mail,
  Phone,
  Save,
  Home,
  DollarSign,
  Shield
} from 'lucide-react'

export function Profile() {
  const { profile, user } = useAuth()
  const { data: leases } = useLeases({ tenantId: profile?.id, activeOnly: true })
  const updateProfile = useUpdateProfile()

  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProfile.mutateAsync({
        id: profile!.id,
        full_name: formData.full_name,
        phone: formData.phone || undefined
      })
      toast.success('Profile updated')
      setEditing(false)
    } catch {
      toast.error('Failed to update profile')
    }
  }

  const activeLease = leases?.[0]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-semibold">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{profile?.full_name}</h2>
            <p className="text-gray-600">{profile?.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <Shield className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-500 capitalize">{profile?.role}</span>
            </div>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  className="input pl-10 bg-gray-50"
                  disabled
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="label">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input pl-10"
                  placeholder="+1 (416) 555-0123"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="btn btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="font-medium text-gray-900">{profile?.full_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{profile?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium text-gray-900">{profile?.phone || 'Not set'}</p>
              </div>
            </div>

            <button
              onClick={() => setEditing(true)}
              className="btn btn-secondary w-full mt-4"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Tenant Lease Info */}
      {profile?.role === 'tenant' && activeLease && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">My Rental</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Home className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600">Property</p>
                <p className="font-medium text-gray-900">
                  {activeLease.unit?.property?.name} - {activeLease.unit?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-green-600">Monthly Rent</p>
                <p className="font-medium text-gray-900">
                  ${activeLease.base_rent.toFixed(2)}
                  {(activeLease.includes_gas || activeLease.includes_water || activeLease.includes_hydro) && (
                    <span className="text-sm text-gray-500">
                      {' '}+ utilities
                    </span>
                  )}
                </p>
              </div>
            </div>

            {(activeLease.includes_gas || activeLease.includes_water || activeLease.includes_hydro) && (
              <div className="grid grid-cols-3 gap-2">
                {activeLease.includes_gas && (
                  <div className="p-2 bg-gray-50 rounded text-center">
                    <p className="text-xs text-gray-500">Gas</p>
                    <p className="font-medium">${activeLease.gas_amount?.toFixed(2)}</p>
                  </div>
                )}
                {activeLease.includes_water && (
                  <div className="p-2 bg-gray-50 rounded text-center">
                    <p className="text-xs text-gray-500">Water</p>
                    <p className="font-medium">${activeLease.water_amount?.toFixed(2)}</p>
                  </div>
                )}
                {activeLease.includes_hydro && (
                  <div className="p-2 bg-gray-50 rounded text-center">
                    <p className="text-xs text-gray-500">Hydro</p>
                    <p className="font-medium">${activeLease.hydro_amount?.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
