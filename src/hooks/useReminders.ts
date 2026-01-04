import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Reminder } from '../types/database'

export function useReminders(userId?: string) {
  return useQuery({
    queryKey: ['reminders', userId],
    queryFn: async () => {
      let query = supabase
        .from('reminders')
        .select('*')
        .order('due_date', { ascending: true })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Reminder[]
    }
  })
}

export function useUpcomingReminders(userId: string, days: number = 7) {
  return useQuery({
    queryKey: ['reminders', 'upcoming', userId, days],
    queryFn: async () => {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + days)

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .gte('due_date', today.toISOString().split('T')[0])
        .lte('due_date', futureDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true })

      if (error) throw error
      return data as Reminder[]
    },
    enabled: !!userId
  })
}

export function useCreateReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reminder: Omit<Reminder, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('reminders')
        .insert(reminder)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    }
  })
}

export function useUpdateReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...reminder }: Partial<Reminder> & { id: string }) => {
      const { data, error } = await supabase
        .from('reminders')
        .update(reminder)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    }
  })
}

export function useDeleteReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    }
  })
}

export function useToggleReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({ is_completed: isCompleted })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
    }
  })
}
