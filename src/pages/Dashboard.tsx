import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProperties } from '../hooks/useProperties'
import { useLeases } from '../hooks/useLeases'
import { usePayments } from '../hooks/usePayments'
import { useUpcomingReminders } from '../hooks/useReminders'
import { PageLoader } from '../components/LoadingSpinner'
import { format } from 'date-fns'
import {
  Building2,
  Users,
  DollarSign,
  Bell,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight
} from 'lucide-react'

export function Dashboard() {
  const { profile } = useAuth()
  const { data: properties, isLoading: propertiesLoading } = useProperties()
  const { data: leases, isLoading: leasesLoading } = useLeases({ activeOnly: true })
  const { data: payments, isLoading: paymentsLoading } = usePayments()
  const { data: reminders } = useUpcomingReminders(profile?.id || '', 7)

  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager'

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const stats = useMemo(() => {
    if (!leases || !payments) return null

    const totalExpectedRent = leases.reduce((sum, lease) => {
      let total = lease.base_rent
      if (lease.includes_gas && lease.gas_amount) total += lease.gas_amount
      if (lease.includes_water && lease.water_amount) total += lease.water_amount
      if (lease.includes_hydro && lease.hydro_amount) total += lease.hydro_amount
      return sum + total
    }, 0)

    const monthPayments = payments.filter(
      p => p.month === currentMonth && p.year === currentYear
    )

    const collectedThisMonth = monthPayments.reduce((sum, p) => sum + p.amount, 0)

    const pendingAmount = totalExpectedRent - collectedThisMonth

    return {
      totalProperties: properties?.length || 0,
      activeLeases: leases.length,
      expectedRent: totalExpectedRent,
      collectedThisMonth,
      pendingAmount,
      collectionRate: totalExpectedRent > 0 ? (collectedThisMonth / totalExpectedRent) * 100 : 0
    }
  }, [properties, leases, payments, currentMonth, currentYear])

  if (propertiesLoading || leasesLoading || paymentsLoading) {
    return <PageLoader />
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's an overview of your rental properties
        </p>
      </div>

      {/* Stats Grid */}
      {isAdminOrManager && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Properties</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProperties}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Tenants</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeLeases}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Collected This Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.collectedThisMonth.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                stats.pendingAmount > 0 ? 'bg-orange-100' : 'bg-green-100'
              }`}>
                {stats.pendingAmount > 0 ? (
                  <Clock className="h-6 w-6 text-orange-600" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${stats.pendingAmount.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collection Progress */}
      {isAdminOrManager && stats && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {format(new Date(), 'MMMM yyyy')} Collection
              </h2>
              <p className="text-sm text-gray-600">
                {stats.collectionRate.toFixed(0)}% collected
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(stats.collectionRate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-600">
              Collected: ${stats.collectedThisMonth.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-gray-600">
              Expected: ${stats.expectedRent.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Reminders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Reminders</h2>
            <Link to="/reminders" className="text-blue-600 hover:underline text-sm flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {reminders && reminders.length > 0 ? (
            <div className="space-y-3">
              {reminders.slice(0, 5).map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                >
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{reminder.title}</p>
                    <p className="text-sm text-gray-600">
                      Due: {format(new Date(reminder.due_date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No upcoming reminders</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {isAdminOrManager && (
              <>
                <Link
                  to="/payments/new"
                  className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                >
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Record Payment</span>
                </Link>
                <Link
                  to="/reminders/new"
                  className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                >
                  <Bell className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Add Reminder</span>
                </Link>
                <Link
                  to="/tenants"
                  className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                >
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">View Tenants</span>
                </Link>
                <Link
                  to="/properties"
                  className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                >
                  <Building2 className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">Properties</span>
                </Link>
              </>
            )}
            {profile?.role === 'tenant' && (
              <>
                <Link
                  to="/payments"
                  className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                >
                  <DollarSign className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">My Payments</span>
                </Link>
                <Link
                  to="/profile"
                  className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                >
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">My Profile</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {isAdminOrManager && stats && stats.pendingAmount > 0 && (
        <div className="card border-orange-200 bg-orange-50">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-orange-900">Pending Rent Collection</h3>
              <p className="text-orange-800 mt-1">
                You have ${stats.pendingAmount.toLocaleString('en-CA', { minimumFractionDigits: 2 })} pending for this month.
                Consider sending reminders to tenants.
              </p>
              <Link
                to="/payments"
                className="inline-flex items-center gap-1 mt-3 text-orange-700 hover:text-orange-900 font-medium"
              >
                View payment details <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
