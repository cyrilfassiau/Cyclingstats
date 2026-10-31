import { useQueries } from '@tanstack/react-query'
import {
  allStagesQuery,
  gcQuery,
  mountainsQuery,
  pointsQuery,
  ridersQuery,
  teamsQuery,
  youthQuery,
} from '@/api/queries'
import { buildRiderStats } from './stats'

/** Lance les 7 requêtes en parallèle et ne calcule les stats qu'une fois tout reçu. */
export function useRiderStats() {
  return useQueries({
    queries: [
      ridersQuery,
      teamsQuery,
      gcQuery,
      pointsQuery,
      mountainsQuery,
      youthQuery,
      allStagesQuery,
    ],
    combine: (results) => {
      const [riders, teams, gc, points, mountains, youth, stages] = results
      const error = results.find((r) => r.error)?.error ?? null
      const retry = () => results.forEach((r) => r.isError && r.refetch())
      if (!riders.data || !teams.data || !gc.data || !points.data || !mountains.data || !youth.data || !stages.data) {
        return { data: undefined, isPending: !error, error, retry }
      }
      const data = buildRiderStats({
        riders: riders.data.items,
        teams: teams.data.items,
        gc: gc.data.items,
        points: points.data.items,
        mountains: mountains.data.items,
        youth: youth.data.items,
        stages: stages.data.items,
      })
      return { data, isPending: false, error, retry }
    },
  })
}
