import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'
import type { Paginated, Stage } from './types'

export function useStages(edition: number, page: number) {
  return useQuery({
    queryKey: ['stages', edition, page],
    queryFn: ({ signal }) =>
      apiGet<Paginated<Stage>>(`/stages?edition=${edition}&page=${page}`, signal),
    staleTime: 5 * 60 * 1000,
  })
}
