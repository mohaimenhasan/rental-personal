import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProperties, useCreateProperty, useDeleteProperty } from '../hooks/useProperties'
import { useUnits } from '../hooks/useUnits'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/LoadingSpinner'
import toast from 'react-hot-toast'
import {
  Building2,
  Plus,
  MapPin,
  Home,
  Trash2,
  Edit,
  Eye,
  MoreVertical
} from 'lucide-react'
import type { Property } from '../types/database'

export function Properties() {
  const { data: properties, isLoading } = useProperties()
  const { data: units } = useUnits()
  const createProperty = useCreateProperty()
  const deleteProperty = useDeleteProperty()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<Property | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: 'Toronto',
    postal_code: '',
    property_type: 'house' as Property['property_type'],
    notes: ''
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createProperty.mutateAsync(formData)
      toast.success('Property created successfully')
      setShowCreateModal(false)
      setFormData({
        name: '',
        address: '',
        city: 'Toronto',
        postal_code: '',
        property_type: 'house',
        notes: ''
      })
    } catch {
      toast.error('Failed to create property')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteProperty.mutateAsync(deleteConfirm.id)
      toast.success('Property deleted')
      setDeleteConfirm(null)
    } catch {
      toast.error('Failed to delete property')
    }
  }

  const getUnitCount = (propertyId: string) => {
    return units?.filter(u => u.property_id === propertyId).length || 0
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600 mt-1">Manage your rental properties</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Property
        </button>
      </div>

      {properties && properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => (
            <div key={property.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{property.name}</h3>
                    <span className="badge badge-info capitalize">{property.property_type}</span>
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === property.id ? null : property.id)}
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <MoreVertical className="h-5 w-5 text-gray-400" />
                  </button>
                  {menuOpen === property.id && (
                    <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
                      <Link
                        to={`/properties/${property.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4" /> View Details
                      </Link>
                      <Link
                        to={`/properties/${property.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="h-4 w-4" /> Edit
                      </Link>
                      <button
                        onClick={() => {
                          setDeleteConfirm(property)
                          setMenuOpen(null)
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{property.address}, {property.city}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Home className="h-4 w-4" />
                  <span className="text-sm">{getUnitCount(property.id)} units</span>
                </div>
              </div>

              <Link
                to={`/properties/${property.id}`}
                className="mt-4 block text-center py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to start managing your rentals"
          action={{ label: 'Add Property', onClick: () => setShowCreateModal(true) }}
        />
      )}

      {/* Create Property Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add New Property"
        size="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Property Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., Main Street House"
              required
            />
          </div>

          <div>
            <label className="label">Property Type</label>
            <select
              value={formData.property_type}
              onChange={(e) => setFormData({ ...formData, property_type: e.target.value as Property['property_type'] })}
              className="input"
              required
            >
              <option value="house">House</option>
              <option value="townhouse">Townhouse</option>
              <option value="condo">Condo</option>
              <option value="apartment">Apartment</option>
            </select>
          </div>

          <div>
            <label className="label">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input"
              placeholder="123 Main Street"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Postal Code</label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="input"
                placeholder="M5V 1A1"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
              rows={3}
              placeholder="Any additional notes about this property..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={createProperty.isPending} className="btn btn-primary flex-1">
              {createProperty.isPending ? 'Creating...' : 'Create Property'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Property"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This will also delete all associated units and leases.`}
        confirmText="Delete"
        loading={deleteProperty.isPending}
      />
    </div>
  )
}
