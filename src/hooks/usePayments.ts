import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Payment, RentComponent } from '../types/database'

interface PaymentFilters {
  leaseId?: string
  month?: number
  year?: number
  component?: RentComponent
}

export function usePayments(filters?: PaymentFilters) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          lease:leases(*, unit:units(*, property:properties(*)), tenant:profiles(*)),
          recorder:profiles!payments_recorded_by_fkey(*)
        `)
        .order('payment_date', { ascending: false })

      if (filters?.leaseId) {
        query = query.eq('lease_id', filters.leaseId)
      }
      if (filters?.month) {
        query = query.eq('month', filters.month)
      }
      if (filters?.year) {
        query = query.eq('year', filters.year)
      }
      if (filters?.component) {
        query = query.eq('component', filters.component)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Payment[]
    }
  })
}

export function usePaymentsByMonth(year: number, month: number) {
  return useQuery({
    queryKey: ['payments', 'by-month', year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          lease:leases(*, unit:units(*, property:properties(*)), tenant:profiles(*))
        `)
        .eq('year', year)
        .eq('month', month)
        .order('payment_date', { ascending: false })

      if (error) throw error
      return data as Payment[]
    }
  })
}

export function useCreatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payment: Omit<Payment, 'id' | 'created_at' | 'lease' | 'recorder'>) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(payment)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    }
  })
}

export function useUpdatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...payment }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from('payments')
        .update(payment)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    }
  })
}

export function useDeletePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    }
  })
}
