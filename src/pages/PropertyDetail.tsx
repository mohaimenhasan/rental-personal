import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useProperty, useUpdateProperty } from '../hooks/useProperties'
import { useUnits, useCreateUnit, useDeleteUnit } from '../hooks/useUnits'
import { useLeases } from '../hooks/useLeases'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PageLoader } from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Building2,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Users,
  Bed,
  Bath,
  Save
} from 'lucide-react'
import type { Unit } from '../types/database'

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: property, isLoading } = useProperty(id || '')
  const { data: units } = useUnits(id)
  const { data: leases } = useLeases()
  const updateProperty = useUpdateProperty()
  const createUnit = useCreateUnit()
  const deleteUnit = useDeleteUnit()

  const [editing, setEditing] = useState(false)
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Unit | null>(null)

  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    notes: ''
  })

  const [unitForm, setUnitForm] = useState({
    name: '',
    bedrooms: 1,
    bathrooms: 1,
    is_shared_bathroom: false,
    notes: ''
  })

  const handleEditStart = () => {
    if (property) {
      setPropertyForm({
        name: property.name,
        address: property.address,
        city: property.city,
        postal_code: property.postal_code,
        notes: property.notes || ''
      })
      setEditing(true)
    }
  }

  const handlePropertyUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateProperty.mutateAsync({ id: id!, ...propertyForm })
      toast.success('Property updated')
      setEditing(false)
    } catch {
      toast.error('Failed to update property')
    }
  }

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createUnit.mutateAsync({ property_id: id!, ...unitForm })
      toast.success('Unit created')
      setShowUnitModal(false)
      setUnitForm({ name: '', bedrooms: 1, bathrooms: 1, is_shared_bathroom: false, notes: '' })
    } catch {
      toast.error('Failed to create unit')
    }
  }

  const handleDeleteUnit = async () => {
    if (!deleteConfirm) return
    try {
      await deleteUnit.mutateAsync(deleteConfirm.id)
      toast.success('Unit deleted')
      setDeleteConfirm(null)
    } catch {
      toast.error('Failed to delete unit')
    }
  }

  const getActiveLease = (unitId: string) => {
    return leases?.find(l => l.unit_id === unitId && l.is_active)
  }

  if (isLoading) return <PageLoader />
  if (!property) return <div className="text-center py-12">Property not found</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/properties')} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
          <div className="flex items-center gap-2 text-gray-600 mt-1">
            <MapPin className="h-4 w-4" />
            <span>{property.address}, {property.city} {property.postal_code}</span>
          </div>
        </div>
        <button onClick={handleEditStart} className="btn btn-secondary flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
        </button>
      </div>

      {/* Property Details Card */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Property Details</h2>
            <span className="badge badge-info capitalize">{property.property_type}</span>
          </div>
        </div>
        {property.notes && (
          <p className="text-gray-600 mt-4">{property.notes}</p>
        )}
      </div>

      {/* Units Section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Units</h2>
          <button onClick={() => setShowUnitModal(true)} className="btn btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Unit
          </button>
        </div>

        {units && units.length > 0 ? (
          <div className="space-y-3">
            {units.map((unit) => {
              const lease = getActiveLease(unit.id)
              return (
                <div key={unit.id} className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{unit.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          {unit.bedrooms} bed
                        </span>
                        <span className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          {unit.bathrooms} bath {unit.is_shared_bathroom && '(shared)'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lease ? (
                        <span className="badge badge-success flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Occupied
                        </span>
                      ) : (
                        <span className="badge badge-warning">Vacant</span>
                      )}
                      <button
                        onClick={() => setDeleteConfirm(unit)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {lease && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-600">
                        Tenant: <Link to={`/tenants/${lease.tenant_id}`} className="text-blue-600 hover:underline">
                          {lease.tenant?.full_name}
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No units yet. Add a unit to start renting.
          </div>
        )}
      </div>

      {/* Edit Property Modal */}
      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Edit Property" size="lg">
        <form onSubmit={handlePropertyUpdate} className="space-y-4">
          <div>
            <label className="label">Property Name</label>
            <input
              type="text"
              value={propertyForm.name}
              onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Address</label>
            <input
              type="text"
              value={propertyForm.address}
              onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
              className="input"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City</label>
              <input
                type="text"
                value={propertyForm.city}
                onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Postal Code</label>
              <input
                type="text"
                value={propertyForm.postal_code}
                onChange={(e) => setPropertyForm({ ...propertyForm, postal_code: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              value={propertyForm.notes}
              onChange={(e) => setPropertyForm({ ...propertyForm, notes: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={updateProperty.isPending} className="btn btn-primary flex-1 flex items-center justify-center gap-2">
              <Save className="h-4 w-4" />
              {updateProperty.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Unit Modal */}
      <Modal isOpen={showUnitModal} onClose={() => setShowUnitModal(false)} title="Add Unit" size="md">
        <form onSubmit={handleCreateUnit} className="space-y-4">
          <div>
            <label className="label">Unit Name</label>
            <input
              type="text"
              value={unitForm.name}
              onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
              className="input"
              placeholder="e.g., Basement Room 1, Upstairs, Main Floor"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Bedrooms</label>
              <input
                type="number"
                value={unitForm.bedrooms}
                onChange={(e) => setUnitForm({ ...unitForm, bedrooms: parseInt(e.target.value) })}
                className="input"
                min="0"
                required
              />
            </div>
            <div>
              <label className="label">Bathrooms</label>
              <input
                type="number"
                value={unitForm.bathrooms}
                onChange={(e) => setUnitForm({ ...unitForm, bathrooms: parseFloat(e.target.value) })}
                className="input"
                min="0"
                step="0.5"
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={unitForm.is_shared_bathroom}
              onChange={(e) => setUnitForm({ ...unitForm, is_shared_bathroom: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Shared bathroom</span>
          </label>
          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              value={unitForm.notes}
              onChange={(e) => setUnitForm({ ...unitForm, notes: e.target.value })}
              className="input"
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setShowUnitModal(false)} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={createUnit.isPending} className="btn btn-primary flex-1">
              {createUnit.isPending ? 'Creating...' : 'Add Unit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Unit Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteUnit}
        title="Delete Unit"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This will also delete any associated leases.`}
        confirmText="Delete"
        loading={deleteUnit.isPending}
      />
    </div>
  )
}
