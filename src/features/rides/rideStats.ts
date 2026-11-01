import type { Stage } from '@/api/types'
import { haversineKm } from '@/lib/geo'
import type { TrackPoint } from './gpx'

/** Point allégé conservé pour la carte et les graphiques. */
export interface TrackSample {
  lat: number
  lon: number
  ele: number | null
  km: number
  speed: number | null
}

export interface Ride {
  id: string
  name: string
  fileName: string
  startTime: number | null
  endTime: number | null
  distanceKm: number
  elevationGain: number | null
  movingSeconds: number | null
  totalSeconds: number | null
  avgSpeedKmh: number | null
  maxSpeedKmh: number | null
  track: TrackSample[]
}

/** En dessous de cette vitesse, on considère que le cycliste est à l'arrêt. */
const MOVING_THRESHOLD_KMH = 3
/** Vitesse au-delà de laquelle un point est considéré comme un saut GPS. */
const MAX_PLAUSIBLE_KMH = 120
const SPEED_WINDOW = 3
const ELEVATION_WINDOW = 5
const ELEVATION_THRESHOLD_M = 3
export const MAX_SAMPLES = 500

function movingAverage(values: number[], window: number) {
  const half = Math.floor(window / 2)
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - half), i + half + 1)
    return slice.reduce((sum, v) => sum + v, 0) / slice.length
  })
}

/**
 * Dénivelé positif cumulé. Les altitudes sont lissées, puis une montée n'est comptée qu'une
 * fois dépassé de 3 m le dernier point bas (hystérésis) : le bruit de l'altimètre, qui oscille
 * de quelques mètres, n'est ainsi jamais additionné.
 */
export function elevationGain(elevations: number[]) {
  const smooth = movingAverage(elevations, ELEVATION_WINDOW)
  let gain = 0
  let reference = smooth[0] ?? 0
  for (const value of smooth) {
    if (value < reference) reference = value
    else if (value - reference >= ELEVATION_THRESHOLD_M) {
      gain += value - reference
      reference = value
    }
  }
  return gain
}

/** Indices répartis régulièrement, premier et dernier inclus. */
export function sampleIndices(length: number, max: number) {
  if (length <= max) return Array.from({ length }, (_, i) => i)
  const step = (length - 1) / (max - 1)
  return Array.from({ length: max }, (_, i) => Math.round(i * step))
}

export function computeRide(
  points: TrackPoint[],
  info: { id: string; name: string; fileName: string },
): Ride {
  const cumulative = [0]
  for (let i = 1; i < points.length; i++) {
    cumulative.push(
      cumulative[i - 1]! + haversineKm(points[i - 1]!, points[i]!),
    )
  }
  const distanceKm = cumulative[cumulative.length - 1] ?? 0

  const elevations = points.map((p) => p.ele)
  const hasElevation = elevations.every((e) => e !== null)
  const gain = hasElevation ? elevationGain(elevations as number[]) : null

  const hasTime = points.every((p) => p.time !== null)
  const times = points.map((p) => p.time ?? 0)

  // Vitesse en chaque point, mesurée sur une fenêtre de ±3 points pour lisser le GPS.
  const speeds = points.map((_, i) => {
    if (!hasTime) return null
    const a = Math.max(0, i - SPEED_WINDOW)
    const b = Math.min(points.length - 1, i + SPEED_WINDOW)
    const hours = (times[b]! - times[a]!) / 3_600_000
    if (hours <= 0) return null
    const speed = (cumulative[b]! - cumulative[a]!) / hours
    return speed <= MAX_PLAUSIBLE_KMH ? speed : null
  })

  let movingSeconds: number | null = null
  let totalSeconds: number | null = null
  if (hasTime) {
    movingSeconds = 0
    for (let i = 1; i < points.length; i++) {
      const seconds = (times[i]! - times[i - 1]!) / 1000
      if (seconds <= 0) continue
      const speed = (cumulative[i]! - cumulative[i - 1]!) / (seconds / 3600)
      if (speed >= MOVING_THRESHOLD_KMH && speed <= MAX_PLAUSIBLE_KMH)
        movingSeconds += seconds
    }
    totalSeconds = (times[times.length - 1]! - times[0]!) / 1000
  }

  const validSpeeds = speeds.filter((s): s is number => s !== null)
  const track = sampleIndices(points.length, MAX_SAMPLES).map(
    (i): TrackSample => {
      const p = points[i]!
      return {
        lat: Math.round(p.lat * 1e5) / 1e5,
        lon: Math.round(p.lon * 1e5) / 1e5,
        ele: p.ele === null ? null : Math.round(p.ele),
        km: Math.round(cumulative[i]! * 100) / 100,
        speed: speeds[i] == null ? null : Math.round(speeds[i]! * 10) / 10,
      }
    },
  )

  return {
    ...info,
    startTime: hasTime ? times[0]! : null,
    endTime: hasTime ? times[times.length - 1]! : null,
    distanceKm,
    elevationGain: gain,
    movingSeconds,
    totalSeconds,
    avgSpeedKmh: movingSeconds ? distanceKm / (movingSeconds / 3600) : null,
    maxSpeedKmh: validSpeeds.length ? Math.max(...validSpeeds) : null,
    track,
  }
}

export interface MonthStats {
  /** Clé triable « 2026-09 » */
  month: string
  count: number
  distanceKm: number
  elevationGain: number
  movingSeconds: number
}

/** Regroupe les sorties datées par mois (heure locale). */
export function groupByMonth(rides: Ride[]): MonthStats[] {
  const months = new Map<string, MonthStats>()
  for (const ride of rides) {
    if (ride.startTime === null) continue
    const date = new Date(ride.startTime)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const entry = months.get(month) ?? {
      month,
      count: 0,
      distanceKm: 0,
      elevationGain: 0,
      movingSeconds: 0,
    }
    entry.count += 1
    entry.distanceKm += ride.distanceKm
    entry.elevationGain += ride.elevationGain ?? 0
    entry.movingSeconds += ride.movingSeconds ?? 0
    months.set(month, entry)
  }
  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month))
}

/** Étape du Tour dont la distance est la plus proche de celle de la sortie. */
export function closestStage(stages: Stage[], distanceKm: number) {
  let best: Stage | undefined
  for (const stage of stages) {
    if (
      !best ||
      Math.abs(stage.distanceKm - distanceKm) <
        Math.abs(best.distanceKm - distanceKm)
    ) {
      best = stage
    }
  }
  return best
}
