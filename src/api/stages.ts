import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGet, apiGetList } from './client'
import type { Stage, StageType } from './types'

export interface StageQuery {
  type?: StageType
  sort?: keyof Stage
  order?: 'asc' | 'desc'
}

export function useStages(query: StageQuery = {}) {
  return useQuery({
    queryKey: ['stages', query],
    // Le signal annule la requête en cours si un filtre change avant la réponse.
    queryFn: ({ signal }) =>
      apiGetList<Stage>(
        '/stages',
        { type: query.type, _sort: query.sort, _order: query.order },
        signal,
      ),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  })
}

export function useStage(id: number) {
  return useQuery({
    queryKey: ['stages', 'detail', id],
    queryFn: ({ signal }) => apiGet<Stage>(`/stages/${id}`, undefined, signal),
    staleTime: Infinity,
  })
}
