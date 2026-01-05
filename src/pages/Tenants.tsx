import { useState } from 'react'
import { useTenants, useUpdateUserRole, useInviteTenant } from '../hooks/useProfiles'
import { useLeases, useCreateLease } from '../hooks/useLeases'
import { useUnits } from '../hooks/useUnits'
import { Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/LoadingSpinner'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Users,
  Mail,
  Phone,
  Home,
  DollarSign,
  MoreVertical,
  UserCog,
  FileText,
  UserPlus,
  Send
} from 'lucide-react'
import type { UserRole } from '../types/database'

export function Tenants() {
  const { data: tenants, isLoading } = useTenants()
  const { data: leases } = useLeases()
  const { data: units } = useUnits()
  const createLease = useCreateLease()
  const updateRole = useUpdateUserRole()
  const inviteTenant = useInviteTenant()

  const [showLeaseModal, setShowLeaseModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const [inviteForm, setInviteForm] = useState({
    email: '',
    full_name: ''
  })

  const [leaseForm, setLeaseForm] = useState({
    unit_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    base_rent: '',
    includes_gas: false,
    includes_water: false,
    includes_hydro: false,
    gas_amount: '',
    water_amount: '',
    hydro_amount: ''
  })

  const getActiveLease = (tenantId: string) => {
    return leases?.find(l => l.tenant_id === tenantId && l.is_active)
  }

  const availableUnits = units?.filter(unit => {
    const hasActiveLease = leases?.some(l => l.unit_id === unit.id && l.is_active)
    return !hasActiveLease
  })

  const handleCreateLease = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTenant) return

    try {
      await createLease.mutateAsync({
        unit_id: leaseForm.unit_id,
        tenant_id: selectedTenant,
        start_date: leaseForm.start_date,
        is_active: true,
        base_rent: parseFloat(leaseForm.base_rent),
        includes_gas: leaseForm.includes_gas,
        includes_water: leaseForm.includes_water,
        includes_hydro: leaseForm.includes_hydro,
        gas_amount: leaseForm.gas_amount ? parseFloat(leaseForm.gas_amount) : undefined,
        water_amount: leaseForm.water_amount ? parseFloat(leaseForm.water_amount) : undefined,
        hydro_amount: leaseForm.hydro_amount ? parseFloat(leaseForm.hydro_amount) : undefined
      })
      toast.success('Lease created successfully')
      setShowLeaseModal(false)
      setSelectedTenant(null)
      setLeaseForm({
        unit_id: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        base_rent: '',
        includes_gas: false,
        includes_water: false,
        includes_hydro: false,
        gas_amount: '',
        water_amount: '',
        hydro_amount: ''
      })
    } catch {
      toast.error('Failed to create lease')
    }
  }

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await updateRole.mutateAsync({ userId, role })
      toast.success('Role updated')
      setMenuOpen(null)
    } catch {
      toast.error('Failed to update role')
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await inviteTenant.mutateAsync({
        email: inviteForm.email,
        full_name: inviteForm.full_name || undefined
      })
      toast.success('Invitation sent! They will receive an email to set up their account.')
      setShowInviteModal(false)
      setInviteForm({ email: '', full_name: '' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-600 mt-1">Manage your tenants and leases</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <UserPlus className="h-5 w-5" />
          Invite Tenant
        </button>
      </div>

      {tenants && tenants.length > 0 ? (
        <div className="space-y-4">
          {tenants.map((tenant) => {
            const lease = getActiveLease(tenant.id)
            const unit = lease ? units?.find(u => u.id === lease.unit_id) : null

            return (
              <div key={tenant.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                      {tenant.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{tenant.full_name}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {tenant.email}
                        </span>
                        {tenant.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {tenant.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === tenant.id ? null : tenant.id)}
                      className="p-2 rounded-lg hover:bg-gray-100"
                    >
                      <MoreVertical className="h-5 w-5 text-gray-400" />
                    </button>
                    {menuOpen === tenant.id && (
                      <div className="absolute right-0 top-10 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[180px]">
                        <button
                          onClick={() => {
                            setSelectedTenant(tenant.id)
                            setShowLeaseModal(true)
                            setMenuOpen(null)
                          }}
                          disabled={!!lease || !availableUnits?.length}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full disabled:opacity-50"
                        >
                          <FileText className="h-4 w-4" /> Create Lease
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <div className="px-4 py-2 text-xs text-gray-500">Change Role</div>
                        <button
                          onClick={() => handleRoleChange(tenant.id, 'manager')}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <UserCog className="h-4 w-4" /> Make Manager
                        </button>
                        <button
                          onClick={() => handleRoleChange(tenant.id, 'admin')}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <UserCog className="h-4 w-4" /> Make Admin
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {lease && unit && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Home className="h-4 w-4" />
                          <span className="text-sm">
                            {unit.property?.name} - {unit.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm">
                            ${lease.base_rent.toFixed(2)}/month
                          </span>
                        </div>
                      </div>
                      <span className="badge badge-success">Active Lease</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {lease.includes_gas && (
                        <span className="badge badge-info">Gas: ${lease.gas_amount?.toFixed(2)}</span>
                      )}
                      {lease.includes_water && (
                        <span className="badge badge-info">Water: ${lease.water_amount?.toFixed(2)}</span>
                      )}
                      {lease.includes_hydro && (
                        <span className="badge badge-info">Hydro: ${lease.hydro_amount?.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                )}

                {!lease && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <span className="badge badge-warning">No Active Lease</span>
                    {availableUnits && availableUnits.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedTenant(tenant.id)
                          setShowLeaseModal(true)
                        }}
                        className="ml-4 text-sm text-blue-600 hover:underline"
                      >
                        Create Lease
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No tenants yet"
          description="Tenants will appear here once they sign up and you assign them leases"
        />
      )}

      {/* Create Lease Modal */}
      <Modal
        isOpen={showLeaseModal}
        onClose={() => {
          setShowLeaseModal(false)
          setSelectedTenant(null)
        }}
        title="Create Lease"
        size="lg"
      >
        <form onSubmit={handleCreateLease} className="space-y-4">
          <div>
            <label className="label">Unit</label>
            <select
              value={leaseForm.unit_id}
              onChange={(e) => setLeaseForm({ ...leaseForm, unit_id: e.target.value })}
              className="input"
              required
            >
              <option value="">Select a unit...</option>
              {availableUnits?.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.property?.name} - {unit.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={leaseForm.start_date}
                onChange={(e) => setLeaseForm({ ...leaseForm, start_date: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Base Rent (CAD)</label>
              <input
                type="number"
                value={leaseForm.base_rent}
                onChange={(e) => setLeaseForm({ ...leaseForm, base_rent: e.target.value })}
                className="input"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Additional Charges</p>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={leaseForm.includes_gas}
                  onChange={(e) => setLeaseForm({ ...leaseForm, includes_gas: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Gas</span>
              </label>
              {leaseForm.includes_gas && (
                <input
                  type="number"
                  value={leaseForm.gas_amount}
                  onChange={(e) => setLeaseForm({ ...leaseForm, gas_amount: e.target.value })}
                  className="input w-32"
                  placeholder="Amount"
                  step="0.01"
                  min="0"
                />
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={leaseForm.includes_water}
                  onChange={(e) => setLeaseForm({ ...leaseForm, includes_water: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Water</span>
              </label>
              {leaseForm.includes_water && (
                <input
                  type="number"
                  value={leaseForm.water_amount}
                  onChange={(e) => setLeaseForm({ ...leaseForm, water_amount: e.target.value })}
                  className="input w-32"
                  placeholder="Amount"
                  step="0.01"
                  min="0"
                />
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={leaseForm.includes_hydro}
                  onChange={(e) => setLeaseForm({ ...leaseForm, includes_hydro: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Hydro-Electric</span>
              </label>
              {leaseForm.includes_hydro && (
                <input
                  type="number"
                  value={leaseForm.hydro_amount}
                  onChange={(e) => setLeaseForm({ ...leaseForm, hydro_amount: e.target.value })}
                  className="input w-32"
                  placeholder="Amount"
                  step="0.01"
                  min="0"
                />
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowLeaseModal(false)
                setSelectedTenant(null)
              }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button type="submit" disabled={createLease.isPending} className="btn btn-primary flex-1">
              {createLease.isPending ? 'Creating...' : 'Create Lease'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Invite Tenant Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false)
          setInviteForm({ email: '', full_name: '' })
        }}
        title="Invite Tenant"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <p className="text-sm text-gray-600">
            Send an email invitation to a new tenant. They'll receive a link to create their account.
          </p>

          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              className="input"
              placeholder="tenant@example.com"
              required
            />
          </div>

          <div>
            <label className="label">Full Name (Optional)</label>
            <input
              type="text"
              value={inviteForm.full_name}
              onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
              className="input"
              placeholder="John Smith"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowInviteModal(false)
                setInviteForm({ email: '', full_name: '' })
              }}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteTenant.isPending}
              className="btn btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {inviteTenant.isPending ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
