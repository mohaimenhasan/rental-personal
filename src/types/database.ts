export type UserRole = 'admin' | 'manager' | 'tenant'

export type PaymentMethod = 'etransfer' | 'cash' | 'cheque' | 'bank_transfer'

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue'

export type RentComponent = 'base_rent' | 'gas' | 'water' | 'hydro'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone?: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  name: string
  address: string
  city: string
  postal_code: string
  property_type: 'house' | 'townhouse' | 'condo' | 'apartment'
  notes?: string
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  property_id: string
  name: string
  bedrooms: number
  bathrooms: number
  is_shared_bathroom: boolean
  notes?: string
  created_at: string
  updated_at: string
  property?: Property
}

export interface Lease {
  id: string
  unit_id: string
  tenant_id: string
  start_date: string
  end_date?: string
  is_active: boolean
  base_rent: number
  includes_gas: boolean
  includes_water: boolean
  includes_hydro: boolean
  gas_amount?: number
  water_amount?: number
  hydro_amount?: number
  notes?: string
  created_at: string
  updated_at: string
  unit?: Unit
  tenant?: Profile
}

export interface Payment {
  id: string
  lease_id: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  component: RentComponent
  month: number
  year: number
  notes?: string
  recorded_by: string
  created_at: string
  lease?: Lease
  recorder?: Profile
}

export interface Reminder {
  id: string
  user_id: string
  title: string
  description?: string
  due_date: string
  is_completed: boolean
  send_email: boolean
  send_sms: boolean
  created_at: string
  updated_at: string
}

export type RentReminderStatus = 'pending' | 'paid' | 'late'

export interface RentReminder {
  id: string
  lease_id: string
  month: string
  base_rent: number
  gas_amount: number
  water_amount: number
  hydro_amount: number
  total_amount: number
  status: RentReminderStatus
  is_late: boolean
  late_since?: string
  tenant_notified_at?: string
  admin_notified_at?: string
  paid_at?: string
  created_at: string
  updated_at: string
  lease?: Lease
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
      properties: {
        Row: Property
        Insert: Omit<Property, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Property, 'id' | 'created_at' | 'updated_at'>>
      }
      units: {
        Row: Unit
        Insert: Omit<Unit, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Unit, 'id' | 'created_at' | 'updated_at'>>
      }
      leases: {
        Row: Lease
        Insert: Omit<Lease, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Lease, 'id' | 'created_at' | 'updated_at'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'>
        Update: Partial<Omit<Payment, 'id' | 'created_at'>>
      }
      reminders: {
        Row: Reminder
        Insert: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Reminder, 'id' | 'created_at' | 'updated_at'>>
      }
    }
  }
}
