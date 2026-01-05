import { useState } from 'react'
import { Phone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface PhoneRequiredModalProps {
  onComplete: () => void
}

export function PhoneRequiredModal({ onComplete }: PhoneRequiredModalProps) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate phone
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid phone number')
      return
    }

    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Phone number saved!')
      onComplete()
    } catch (error) {
      toast.error('Failed to save phone number')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
            <Phone className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          Phone Number Required
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Please add your phone number to receive rent reminders and important notifications via SMS.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+1 (416) 555-0123"
              required
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Canadian/US format preferred
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? 'Saving...' : 'Save Phone Number'}
          </button>
        </form>
      </div>
    </div>
  )
}
