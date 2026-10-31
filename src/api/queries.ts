import { queryOptions } from '@tanstack/react-query'
import { apiGetList } from './client'
import type {
  GcEntry,
  GcLead,
  PointsEntry,
  Rider,
  Stage,
  Team,
  YouthEntry,
} from './types'

// Le jeu de données est figé : une fois chargé, il ne devient jamais périmé.
function staticList<T>(resource: string, params?: Record<string, string>) {
  return queryOptions({
    queryKey: [resource, 'all'],
    queryFn: ({ signal }) => apiGetList<T>(`/${resource}`, params, signal),
    staleTime: Infinity,
  })
}

export const ridersQuery = staticList<Rider>('riders')
export const teamsQuery = staticList<Team>('teams')
export const gcQuery = staticList<GcEntry>('gc', { _sort: 'rank' })
export const pointsQuery = staticList<PointsEntry>('points', { _sort: 'rank' })
export const mountainsQuery = staticList<PointsEntry>('mountains', { _sort: 'rank' })
export const youthQuery = staticList<YouthEntry>('youth', { _sort: 'rank' })
export const gcLeadQuery = staticList<GcLead>('gcLead', { _sort: 'afterStage' })
export const allStagesQuery = staticList<Stage>('stages', { _sort: 'number' })
