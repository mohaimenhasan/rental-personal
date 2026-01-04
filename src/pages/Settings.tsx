import { useProfiles, useUpdateUserRole } from '../hooks/useProfiles'
import { PageLoader } from '../components/LoadingSpinner'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  Users,
  Shield,
  Mail,
  UserCog
} from 'lucide-react'
import type { UserRole } from '../types/database'

export function Settings() {
  const { profile } = useAuth()
  const { data: profiles, isLoading } = useProfiles()
  const updateRole = useUpdateUserRole()

  const handleRoleChange = async (userId: string, role: UserRole) => {
    if (userId === profile?.id) {
      toast.error("You cannot change your own role")
      return
    }
    try {
      await updateRole.mutateAsync({ userId, role })
      toast.success('Role updated successfully')
    } catch {
      toast.error('Failed to update role')
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage users and system settings</p>
      </div>

      {/* User Management */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-600">Manage user roles and permissions</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles?.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                        {user.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${
                      user.role === 'admin' ? 'badge-danger' :
                      user.role === 'manager' ? 'badge-warning' : 'badge-info'
                    } capitalize flex items-center gap-1 w-fit`}>
                      <Shield className="h-3 w-3" />
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {user.id !== profile?.id ? (
                      <div className="flex justify-end">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={updateRole.isPending}
                        >
                          <option value="tenant">Tenant</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 float-right">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Descriptions */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Role Permissions</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <UserCog className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">Admin</p>
              <p className="text-sm text-red-700">
                Full access to all features. Can manage properties, units, tenants, payments, and other users.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
            <UserCog className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">Manager</p>
              <p className="text-sm text-yellow-700">
                Can view properties, manage tenants, record payments, and create reminders. Cannot manage other users.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <UserCog className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Tenant</p>
              <p className="text-sm text-blue-700">
                Can view their own lease, payment history, and update their profile.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
