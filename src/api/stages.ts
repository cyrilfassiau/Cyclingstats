import { useQuery } from '@tanstack/react-query'
import { apiGetList } from './client'
import type { Stage, StageType } from './types'

export interface StageFilters {
  type?: StageType
  sort?: keyof Stage
  order?: 'asc' | 'desc'
}

export function useStages(filters: StageFilters = {}) {
  return useQuery({
    queryKey: ['stages', filters],
    queryFn: ({ signal }) =>
      apiGetList<Stage>(
        '/stages',
        { type: filters.type, _sort: filters.sort, _order: filters.order },
        signal,
      ),
    staleTime: Infinity,
  })
}
