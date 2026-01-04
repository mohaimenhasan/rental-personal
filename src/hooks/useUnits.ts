import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Unit } from '../types/database'

export function useUnits(propertyId?: string) {
  return useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      let query = supabase
        .from('units')
        .select('*, property:properties(*)')
        .order('created_at', { ascending: false })

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Unit[]
    }
  })
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: ['units', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('*, property:properties(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Unit
    },
    enabled: !!id
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (unit: Omit<Unit, 'id' | 'created_at' | 'updated_at' | 'property'>) => {
      const { data, error } = await supabase
        .from('units')
        .insert(unit)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    }
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...unit }: Partial<Unit> & { id: string }) => {
      const { data, error } = await supabase
        .from('units')
        .update(unit)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    }
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('units')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    }
  })
}
