import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../types/database'

export function useProfiles(role?: UserRole) {
  return useQuery({
    queryKey: ['profiles', role],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })

      if (role) {
        query = query.eq('role', role)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Profile[]
    }
  })
}

export function useTenants() {
  return useProfiles('tenant')
}

export function useManagers() {
  return useQuery({
    queryKey: ['profiles', 'managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'manager'])
        .order('full_name', { ascending: true })

      if (error) throw error
      return data as Profile[]
    }
  })
}

export function useProfile(id: string) {
  return useQuery({
    queryKey: ['profiles', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Profile
    },
    enabled: !!id
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...profile }: Partial<Profile> & { id: string }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(profile)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    }
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    }
  })
}
