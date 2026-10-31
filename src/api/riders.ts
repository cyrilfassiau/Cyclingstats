import { useQuery } from '@tanstack/react-query'
import { apiGetList } from './client'
import type { Rider, Team } from './types'

function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]))
}

// Données figées : on charge les listes complètes une fois et on les indexe par id
// pour résoudre les clés étrangères (riderId, teamId) côté front.
export function useRidersById() {
  return useQuery({
    queryKey: ['riders'],
    queryFn: ({ signal }) => apiGetList<Rider>('/riders', undefined, signal),
    select: (result) => byId(result.items),
    staleTime: Infinity,
  })
}

export function useTeamsById() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: ({ signal }) => apiGetList<Team>('/teams', undefined, signal),
    select: (result) => byId(result.items),
    staleTime: Infinity,
  })
}
