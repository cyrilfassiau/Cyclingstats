import type { Stage, TourMeta } from '@/api/types'
import type { Ride } from './rideStats'

export interface StageProgress {
  stage: Stage
  /** Kilomètres déjà « parcourus » dans cette étape. */
  doneKm: number
}

export interface TourRecap {
  rideCount: number
  totalKm: number
  tourKm: number
  /** Part du Tour couverte, peut dépasser 100. */
  sharePct: number
  /** Nombre de fois où le Tour entier a été bouclé. */
  laps: number
  /** Étapes entièrement couvertes sur le tour en cours. */
  stagesCompleted: number
  /** Première étape non terminée du tour en cours, et kilomètres déjà faits dedans. */
  current: StageProgress | null
  remainingKm: number
  movingSeconds: number
  /** Temps total du vainqueur du Tour. */
  winnerSeconds: number
  timeSharePct: number
  /** Vitesse moyenne sur les sorties horodatées (km parcourus en mouvement / temps). */
  avgSpeedKmh: number | null
  tourSpeedKmh: number
  /** Temps qu'il faudrait pour boucler le Tour à la vitesse moyenne de l'utilisateur. */
  projectedTourSeconds: number | null
  longestRideKm: number
  longestStage: Stage | null
  /** Position (en % du parcours) de la fin de chaque étape, sauf la dernière. */
  stageEnds: number[]
}

/** « 73:56:26 » -> 266186 */
export function durationToSeconds(text: string) {
  return text.split(':').reduce((total, part) => total * 60 + Number(part), 0)
}

/**
 * Met l'ensemble des sorties à l'échelle du Tour de France : les kilomètres cumulés sont
 * « posés » sur le parcours, étape après étape, pour savoir jusqu'où ils mèneraient.
 */
export function computeTourRecap(rides: Ride[], stages: Stage[], meta: TourMeta): TourRecap {
  const ordered = [...stages].sort((a, b) => a.number - b.number)
  const tourKm = ordered.reduce((sum, s) => sum + s.distanceKm, 0) || meta.totalDistanceKm

  const totalKm = rides.reduce((sum, r) => sum + r.distanceKm, 0)
  const timed = rides.filter((r) => r.movingSeconds)
  const movingSeconds = timed.reduce((sum, r) => sum + (r.movingSeconds ?? 0), 0)
  const timedKm = timed.reduce((sum, r) => sum + r.distanceKm, 0)
  const avgSpeedKmh = movingSeconds ? timedKm / (movingSeconds / 3600) : null

  const laps = Math.floor(totalKm / tourKm)
  let rest = totalKm - laps * tourKm
  let stagesCompleted = 0
  let current: StageProgress | null = null
  for (const stage of ordered) {
    if (rest >= stage.distanceKm) {
      rest -= stage.distanceKm
      stagesCompleted += 1
      continue
    }
    current = { stage, doneKm: rest }
    break
  }

  const winnerSeconds = durationToSeconds(meta.winningTime)
  const longestStage = ordered.reduce<Stage | null>(
    (best, s) => (!best || s.distanceKm > best.distanceKm ? s : best),
    null,
  )

  return {
    rideCount: rides.length,
    totalKm,
    tourKm,
    sharePct: (totalKm / tourKm) * 100,
    laps,
    stagesCompleted,
    current,
    remainingKm: laps > 0 ? 0 : tourKm - totalKm,
    movingSeconds,
    winnerSeconds,
    timeSharePct: winnerSeconds ? (movingSeconds / winnerSeconds) * 100 : 0,
    avgSpeedKmh,
    tourSpeedKmh: meta.averageSpeedKmh,
    projectedTourSeconds: avgSpeedKmh ? (tourKm / avgSpeedKmh) * 3600 : null,
    longestRideKm: rides.reduce((max, r) => Math.max(max, r.distanceKm), 0),
    longestStage,
    stageEnds: ordered
      .slice(0, -1)
      .map(
        (_, i) =>
          (ordered.slice(0, i + 1).reduce((sum, s) => sum + s.distanceKm, 0) / tourKm) * 100,
      ),
  }
}
