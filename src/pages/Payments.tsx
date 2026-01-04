import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePayments, useCreatePayment } from '../hooks/usePayments'
import { useLeases } from '../hooks/useLeases'
import { Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/LoadingSpinner'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  DollarSign,
  Plus,
  CreditCard,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import type { RentComponent, PaymentMethod, Lease } from '../types/database'

interface PaymentEntry {
  component: RentComponent
  amount: number
}

interface LeasePaymentStatus {
  lease: Lease
  expected: PaymentEntry[]
  paid: PaymentEntry[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const COMPONENT_LABELS: Record<RentComponent, string> = {
  base_rent: 'Base Rent',
  gas: 'Gas',
  water: 'Water',
  hydro: 'Hydro-Electric'
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  etransfer: 'E-Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer'
}

export function Payments() {
  const { profile } = useAuth()
  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager'

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [filterLease, setFilterLease] = useState<string>('')

  const { data: payments, isLoading: paymentsLoading } = usePayments({
    month: selectedMonth,
    year: selectedYear
  })
  const { data: leases, isLoading: leasesLoading } = useLeases({ activeOnly: true })
  const createPayment = useCreatePayment()

  const [paymentForm, setPaymentForm] = useState({
    lease_id: '',
    component: 'base_rent' as RentComponent,
    amount: '',
    payment_method: 'etransfer' as PaymentMethod,
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  })

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createPayment.mutateAsync({
        lease_id: paymentForm.lease_id,
        component: paymentForm.component,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        month: selectedMonth,
        year: selectedYear,
        notes: paymentForm.notes || undefined,
        recorded_by: profile!.id
      })
      toast.success('Payment recorded')
      setShowPaymentModal(false)
      setPaymentForm({
        lease_id: '',
        component: 'base_rent',
        amount: '',
        payment_method: 'etransfer',
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      })
    } catch {
      toast.error('Failed to record payment')
    }
  }

  const navigateMonth = (direction: number) => {
    let newMonth = selectedMonth + direction
    let newYear = selectedYear

    if (newMonth > 12) {
      newMonth = 1
      newYear++
    } else if (newMonth < 1) {
      newMonth = 12
      newYear--
    }

    setSelectedMonth(newMonth)
    setSelectedYear(newYear)
  }

  // Calculate payment status for each lease
  const leasePaymentStatus = useMemo(() => {
    if (!leases || !payments) return new Map<string, LeasePaymentStatus>()

    const statusMap = new Map<string, LeasePaymentStatus>()

    leases.forEach(lease => {
      const expected: PaymentEntry[] = [
        { component: 'base_rent', amount: lease.base_rent }
      ]
      if (lease.includes_gas && lease.gas_amount) {
        expected.push({ component: 'gas', amount: lease.gas_amount })
      }
      if (lease.includes_water && lease.water_amount) {
        expected.push({ component: 'water', amount: lease.water_amount })
      }
      if (lease.includes_hydro && lease.hydro_amount) {
        expected.push({ component: 'hydro', amount: lease.hydro_amount })
      }

      const leasePayments = payments.filter(p => p.lease_id === lease.id)
      const paid = leasePayments.map(p => ({
        component: p.component,
        amount: p.amount
      }))

      statusMap.set(lease.id, { lease, expected, paid })
    })

    return statusMap
  }, [leases, payments])

  const filteredStatus = useMemo(() => {
    const entries = Array.from(leasePaymentStatus.entries())
    if (!filterLease) return entries
    return entries.filter(([id]) => id === filterLease)
  }, [leasePaymentStatus, filterLease])

  const getPaymentStatus = (expected: PaymentEntry[], paid: PaymentEntry[]) => {
    const totalExpected = expected.reduce((sum, e) => sum + e.amount, 0)
    const totalPaid = paid.reduce((sum, p) => sum + p.amount, 0)

    if (totalPaid >= totalExpected) return 'paid'
    if (totalPaid > 0) return 'partial'
    return 'pending'
  }

  const handleLeaseSelect = (leaseId: string) => {
    const status = leasePaymentStatus.get(leaseId)
    if (status) {
      // Find unpaid components
      const unpaidComponent = status.expected.find(e =>
        !status.paid.some(p => p.component === e.component && p.amount >= e.amount)
      )
      if (unpaidComponent) {
        setPaymentForm({
          ...paymentForm,
          lease_id: leaseId,
          component: unpaidComponent.component,
          amount: unpaidComponent.amount.toString()
        })
      } else {
        setPaymentForm({ ...paymentForm, lease_id: leaseId })
      }
    }
  }

  if (paymentsLoading || leasesLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Track rent payments by month</p>
        </div>
        {isAdminOrManager && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Record Payment
          </button>
        )}
      </div>

      {/* Month Navigation */}
      <div className="card">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </h2>
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Filter */}
      {isAdminOrManager && leases && leases.length > 1 && (
        <div className="flex items-center gap-3">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filterLease}
            onChange={(e) => setFilterLease(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">All Tenants</option>
            {leases.map((lease) => (
              <option key={lease.id} value={lease.id}>
                {lease.tenant?.full_name} - {lease.unit?.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Payment Status Grid */}
      {filteredStatus.length > 0 ? (
        <div className="space-y-4">
          {filteredStatus.map(([leaseId, { lease, expected, paid }]) => {
            const status = getPaymentStatus(expected, paid)
            const totalExpected = expected.reduce((sum, e) => sum + e.amount, 0)
            const totalPaid = paid.reduce((sum, p) => sum + p.amount, 0)

            return (
              <div key={leaseId} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {lease.tenant?.full_name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {lease.unit?.property?.name} - {lease.unit?.name}
                    </p>
                  </div>
                  <div className={`badge ${
                    status === 'paid' ? 'badge-success' :
                    status === 'partial' ? 'badge-warning' : 'badge-danger'
                  } flex items-center gap-1`}>
                    {status === 'paid' ? <CheckCircle className="h-3 w-3" /> :
                     status === 'partial' ? <Clock className="h-3 w-3" /> :
                     <AlertCircle className="h-3 w-3" />}
                    {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Pending'}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        status === 'paid' ? 'bg-green-500' :
                        status === 'partial' ? 'bg-yellow-500' : 'bg-gray-300'
                      }`}
                      style={{ width: `${Math.min((totalPaid / totalExpected) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-sm text-gray-600">
                    <span>${totalPaid.toFixed(2)} paid</span>
                    <span>${totalExpected.toFixed(2)} expected</span>
                  </div>
                </div>

                {/* Component breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {expected.map(({ component, amount }) => {
                    const paidAmount = paid
                      .filter(p => p.component === component)
                      .reduce((sum, p) => sum + p.amount, 0)
                    const isPaid = paidAmount >= amount

                    return (
                      <div
                        key={component}
                        className={`p-3 rounded-lg border ${
                          isPaid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <p className="text-xs text-gray-600">{COMPONENT_LABELS[component]}</p>
                        <p className={`font-semibold ${isPaid ? 'text-green-700' : 'text-gray-900'}`}>
                          ${amount.toFixed(2)}
                        </p>
                        {isPaid && <CheckCircle className="h-4 w-4 text-green-600 mt-1" />}
                      </div>
                    )
                  })}
                </div>

                {/* Recent payments for this lease */}
                {paid.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">Recent Payments</p>
                    <div className="space-y-2">
                      {payments?.filter(p => p.lease_id === leaseId).slice(0, 3).map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-gray-400" />
                            <span>{COMPONENT_LABELS[payment.component]}</span>
                            <span className="text-gray-500">via {METHOD_LABELS[payment.payment_method]}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500">
                              {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                            </span>
                            <span className="font-medium text-green-600">
                              +${payment.amount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={DollarSign}
          title="No payment data"
          description={leases?.length ? "No payments recorded for this period" : "Create leases to start tracking payments"}
        />
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
        size="md"
      >
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              Recording payment for <strong>{MONTHS[selectedMonth - 1]} {selectedYear}</strong>
            </p>
          </div>

          <div>
            <label className="label">Tenant / Unit</label>
            <select
              value={paymentForm.lease_id}
              onChange={(e) => handleLeaseSelect(e.target.value)}
              className="input"
              required
            >
              <option value="">Select tenant...</option>
              {leases?.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.tenant?.full_name} - {lease.unit?.property?.name} / {lease.unit?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Component</label>
              <select
                value={paymentForm.component}
                onChange={(e) => setPaymentForm({ ...paymentForm, component: e.target.value as RentComponent })}
                className="input"
                required
              >
                <option value="base_rent">Base Rent</option>
                <option value="gas">Gas</option>
                <option value="water">Water</option>
                <option value="hydro">Hydro-Electric</option>
              </select>
            </div>
            <div>
              <label className="label">Amount (CAD)</label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                className="input"
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Payment Method</label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as PaymentMethod })}
                className="input"
                required
              >
                <option value="etransfer">E-Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="label">Payment Date</label>
              <input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              className="input"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="btn btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createPayment.isPending}
              className="btn btn-primary flex-1"
            >
              {createPayment.isPending ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
