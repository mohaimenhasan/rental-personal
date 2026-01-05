import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { RentReminder, RentReminderStatus } from '../types/database'

export function useRentReminders(month?: string) {
  return useQuery({
    queryKey: ['rent-reminders', month],
    queryFn: async () => {
      let query = supabase
        .from('rent_reminders')
        .select(`
          *,
          lease:leases (
            id,
            tenant:profiles!leases_tenant_id_fkey (
              id,
              full_name,
              email,
              phone
            ),
            unit:units (
              id,
              name,
              property:properties (
                id,
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (month) {
        query = query.eq('month', month)
      }

      const { data, error } = await query
      if (error) throw error
      return data as RentReminder[]
    }
  })
}

export function useCurrentMonthRentReminders() {
  const currentMonth = new Date()
  currentMonth.setDate(1)
  const monthStr = currentMonth.toISOString().split('T')[0]
  return useRentReminders(monthStr)
}

export function useUpdateRentReminderStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RentReminderStatus }) => {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'paid') {
        updateData.paid_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('rent_reminders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-reminders'] })
    }
  })
}

export function useMyRentReminders() {
  return useQuery({
    queryKey: ['my-rent-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_reminders')
        .select(`
          *,
          lease:leases (
            id,
            unit:units (
              id,
              name,
              property:properties (
                id,
                name
              )
            )
          )
        `)
        .order('month', { ascending: false })

      if (error) throw error
      return data as RentReminder[]
    }
  })
}
