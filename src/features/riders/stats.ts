import type { GcEntry, PointsEntry, Rider, Stage, Team, YouthEntry } from '@/api/types'

export interface RiderStats {
  rider: Rider
  teamName: string
  gcRank?: number
  gapSeconds?: number
  /** Classements annexes : seuls les tops 10 sont connus. */
  pointsRank?: number
  points?: number
  mountainsRank?: number
  mountainPoints?: number
  youthRank?: number
  stageWins: number
  yellowDays: number
}

export interface StatsSources {
  riders: Rider[]
  teams: Team[]
  gc: GcEntry[]
  points: PointsEntry[]
  mountains: PointsEntry[]
  youth: YouthEntry[]
  stages: Stage[]
}

function countBy(values: (string | null)[]) {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return counts
}

/** Croise les ressources de la fausse API en une fiche de stats par coureur. */
export function buildRiderStats(sources: StatsSources) {
  const teamNames = new Map(sources.teams.map((t) => [t.id, t.name]))
  const gc = new Map(sources.gc.map((e) => [e.riderId, e]))
  const points = new Map(sources.points.map((e) => [e.riderId, e]))
  const mountains = new Map(sources.mountains.map((e) => [e.riderId, e]))
  const youth = new Map(sources.youth.map((e) => [e.riderId, e]))
  const wins = countBy(sources.stages.map((s) => s.winnerRiderId))
  const yellow = countBy(sources.stages.map((s) => s.yellowJerseyRiderId))

  const stats = new Map<string, RiderStats>()
  for (const rider of sources.riders) {
    stats.set(rider.id, {
      rider,
      teamName: teamNames.get(rider.teamId) ?? rider.teamId,
      gcRank: gc.get(rider.id)?.rank,
      gapSeconds: gc.get(rider.id)?.gapSeconds,
      pointsRank: points.get(rider.id)?.rank,
      points: points.get(rider.id)?.points,
      mountainsRank: mountains.get(rider.id)?.rank,
      mountainPoints: mountains.get(rider.id)?.points,
      youthRank: youth.get(rider.id)?.rank,
      stageWins: wins.get(rider.id) ?? 0,
      yellowDays: yellow.get(rider.id) ?? 0,
    })
  }
  return stats
}

/** Ordre d'affichage des listes de coureurs : classement général, puis abandons par nom. */
export function compareByGc(a: RiderStats, b: RiderStats) {
  return (
    (a.gcRank ?? Infinity) - (b.gcRank ?? Infinity) ||
    a.rider.name.localeCompare(b.rider.name, 'fr')
  )
}
