import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useReminders, useCreateReminder, useToggleReminder, useDeleteReminder } from '../hooks/useReminders'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/LoadingSpinner'
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns'
import toast from 'react-hot-toast'
import {
  Bell,
  Plus,
  Check,
  Trash2,
  Calendar,
  Mail,
  MessageSquare,
  AlertCircle
} from 'lucide-react'

export function Reminders() {
  const { profile } = useAuth()
  const { data: reminders, isLoading } = useReminders(profile?.id)
  const createReminder = useCreateReminder()
  const toggleReminder = useToggleReminder()
  const deleteReminder = useDeleteReminder()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    send_email: true,
    send_sms: false
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createReminder.mutateAsync({
        user_id: profile!.id,
        title: formData.title,
        description: formData.description || undefined,
        due_date: formData.due_date,
        is_completed: false,
        send_email: formData.send_email,
        send_sms: formData.send_sms
      })
      toast.success('Reminder created')
      setShowCreateModal(false)
      setFormData({
        title: '',
        description: '',
        due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        send_email: true,
        send_sms: false
      })
    } catch {
      toast.error('Failed to create reminder')
    }
  }

  const handleToggle = async (id: string, isCompleted: boolean) => {
    try {
      await toggleReminder.mutateAsync({ id, isCompleted: !isCompleted })
      toast.success(isCompleted ? 'Marked as pending' : 'Marked as complete')
    } catch {
      toast.error('Failed to update reminder')
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteReminder.mutateAsync(deleteConfirm)
      toast.success('Reminder deleted')
      setDeleteConfirm(null)
    } catch {
      toast.error('Failed to delete reminder')
    }
  }

  const filteredReminders = reminders?.filter(r => {
    if (filter === 'pending') return !r.is_completed
    if (filter === 'completed') return r.is_completed
    return true
  })

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isPast(date)) return 'Overdue'
    return format(date, 'dd/MM/yyyy')
  }

  const getDateClass = (dateStr: string, isCompleted: boolean) => {
    if (isCompleted) return 'text-gray-500'
    const date = new Date(dateStr)
    if (isPast(date) && !isToday(date)) return 'text-red-600'
    if (isToday(date)) return 'text-orange-600'
    return 'text-gray-600'
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
          <p className="text-gray-600 mt-1">Stay on top of your rental tasks</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Reminder
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['pending', 'completed', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      {filteredReminders && filteredReminders.length > 0 ? (
        <div className="space-y-3">
          {filteredReminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`card flex items-start gap-4 ${
                reminder.is_completed ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => handleToggle(reminder.id, reminder.is_completed)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  reminder.is_completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-blue-500'
                }`}
              >
                {reminder.is_completed && <Check className="h-4 w-4" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`font-medium ${
                      reminder.is_completed ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}>
                      {reminder.title}
                    </h3>
                    {reminder.description && (
                      <p className="text-sm text-gray-600 mt-1">{reminder.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteConfirm(reminder.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <div className={`flex items-center gap-1 text-sm ${getDateClass(reminder.due_date, reminder.is_completed)}`}>
                    {!reminder.is_completed && isPast(new Date(reminder.due_date)) && !isToday(new Date(reminder.due_date)) && (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <Calendar className="h-4 w-4" />
                    <span>{getDateLabel(reminder.due_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {reminder.send_email && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        <Mail className="h-3 w-3" />
                        Email
                      </span>
                    )}
                    {reminder.send_sms && (
                      <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        <MessageSquare className="h-3 w-3" />
                        SMS
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title={filter === 'all' ? 'No reminders yet' : `No ${filter} reminders`}
          description="Create reminders to stay on top of rent collection and other tasks"
          action={filter !== 'all' ? undefined : { label: 'Add Reminder', onClick: () => setShowCreateModal(true) }}
        />
      )}

      {/* Create Reminder Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Reminder"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input"
              placeholder="e.g., Collect rent from John"
              required
            />
          </div>

          <div>
            <label className="label">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input"
              rows={2}
              placeholder="Any additional details..."
            />
          </div>

          <div>
            <label className="label">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Notifications</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.send_email}
                  onChange={(e) => setFormData({ ...formData, send_email: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">Email reminder</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.send_sms}
                  onChange={(e) => setFormData({ ...formData, send_sms: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">SMS reminder</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createReminder.isPending}
              className="btn btn-primary flex-1"
            >
              {createReminder.isPending ? 'Creating...' : 'Create Reminder'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Reminder"
        message="Are you sure you want to delete this reminder?"
        confirmText="Delete"
        loading={deleteReminder.isPending}
      />
    </div>
  )
}
