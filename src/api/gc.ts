import { useQuery } from '@tanstack/react-query'
import { apiGetList } from './client'
import type { GcEntry } from './types'

export function useGc() {
  return useQuery({
    queryKey: ['gc'],
    queryFn: ({ signal }) => apiGetList<GcEntry>('/gc', { _sort: 'rank' }, signal),
    staleTime: Infinity,
  })
}
