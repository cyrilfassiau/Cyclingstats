import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiGetList } from './client'
import { ridersQuery, teamsQuery } from './queries'
import type { Rider } from './types'

function byId<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]))
}

// Listes complètes indexées par id, pour résoudre les clés étrangères côté front.
export function useRidersById() {
  return useQuery({ ...ridersQuery, select: (result) => byId(result.items) })
}

export function useTeamsById() {
  return useQuery({ ...teamsQuery, select: (result) => byId(result.items) })
}

export const RIDERS_PAGE_SIZE = 20

export interface RidersPageQuery {
  q: string
  team?: string
  nationality?: string
  page: number
}

/** Recherche et pagination faites par l'API (en-tête X-Total-Count). */
export function useRidersPage(query: RidersPageQuery) {
  return useQuery({
    queryKey: ['riders', 'page', query],
    queryFn: ({ signal }) =>
      apiGetList<Rider>(
        '/riders',
        {
          q: query.q,
          teamId: query.team,
          nationality: query.nationality,
          _sort: 'name',
          _page: query.page,
          _limit: RIDERS_PAGE_SIZE,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  })
}
