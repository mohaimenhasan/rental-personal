import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Lease } from '../types/database'

export function useLeases(options?: { unitId?: string; tenantId?: string; activeOnly?: boolean }) {
  return useQuery({
    queryKey: ['leases', options],
    queryFn: async () => {
      let query = supabase
        .from('leases')
        .select(`
          *,
          unit:units(*, property:properties(*)),
          tenant:profiles(*)
        `)
        .order('created_at', { ascending: false })

      if (options?.unitId) {
        query = query.eq('unit_id', options.unitId)
      }
      if (options?.tenantId) {
        query = query.eq('tenant_id', options.tenantId)
      }
      if (options?.activeOnly) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Lease[]
    }
  })
}

export function useLease(id: string) {
  return useQuery({
    queryKey: ['leases', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leases')
        .select(`
          *,
          unit:units(*, property:properties(*)),
          tenant:profiles(*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Lease
    },
    enabled: !!id
  })
}

export function useCreateLease() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (lease: Omit<Lease, 'id' | 'created_at' | 'updated_at' | 'unit' | 'tenant'>) => {
      const { data, error } = await supabase
        .from('leases')
        .insert(lease)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
    }
  })
}

export function useUpdateLease() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...lease }: Partial<Lease> & { id: string }) => {
      const { data, error } = await supabase
        .from('leases')
        .update(lease)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
    }
  })
}

export function useDeleteLease() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leases')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
    }
  })
}
