import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Profile, UserRole } from '../types/database'

export function useInviteTenant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, full_name }: { email: string; full_name?: string }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-tenant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ email, full_name }),
        }
      )

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to invite tenant')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    }
  })
}

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
