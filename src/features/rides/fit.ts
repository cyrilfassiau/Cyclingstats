import FitParser from 'fit-file-parser'
import { SkippedActivity } from './activityErrors'
import type { ParsedGpx, TrackPoint } from './gpx'

/** Fichier FIT illisible. */
export class FitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FitError'
  }
}

const CYCLING_SPORTS = new Set(['cycling', 'e_biking'])
const INDOOR_SUB_SPORTS = new Set(['indoor_cycling', 'virtual_activity', 'spin'])

const SPORT_LABELS: Record<string, string> = {
  running: 'course à pied',
  walking: 'marche',
  hiking: 'randonnée',
  swimming: 'natation',
  training: 'entraînement',
  fitness_equipment: 'appareil de fitness',
  generic: 'activité générique',
}

const SUB_SPORT_LABELS: Record<string, string> = {
  road: 'Route',
  mountain: 'VTT',
  gravel_cycling: 'Gravel',
  cyclocross: 'Cyclo-cross',
  commuting: 'Vélotaf',
  e_bike_mountain: 'VTT électrique',
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/**
 * Lit un fichier FIT (format natif des compteurs Garmin, Wahoo…) dans le navigateur.
 * Ne garde que les sorties vélo avec une trace GPS : les autres activités d'un export
 * Garmin (course à pied, home trainer…) sont signalées comme ignorées.
 */
export async function parseFit(bytes: Uint8Array): Promise<ParsedGpx> {
  let data
  try {
    data = await new FitParser({ force: true, mode: 'list' }).parseAsync(toArrayBuffer(bytes))
  } catch {
    throw new FitError('Ce fichier FIT est illisible.')
  }

  const session = data.sessions?.[0]
  const sport = session?.sport === undefined ? undefined : String(session.sport)
  const subSport = session?.sub_sport === undefined ? undefined : String(session.sub_sport)

  if (sport && !CYCLING_SPORTS.has(sport)) {
    throw new SkippedActivity(`activité « ${SPORT_LABELS[sport] ?? sport} », pas du vélo.`)
  }
  if (subSport && INDOOR_SUB_SPORTS.has(subSport)) {
    throw new SkippedActivity('sortie en intérieur, sans trace GPS.')
  }

  const points: TrackPoint[] = []
  for (const record of data.records ?? []) {
    const lat = record.position_lat
    const lon = record.position_long
    if (typeof lat !== 'number' || typeof lon !== 'number') continue
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const ele = record.enhanced_altitude ?? record.altitude
    points.push({
      lat,
      lon,
      ele: typeof ele === 'number' && Number.isFinite(ele) ? ele : null,
      time: record.timestamp instanceof Date ? record.timestamp.getTime() : null,
    })
  }

  if (points.length < 2) throw new SkippedActivity('pas de trace GPS dans ce fichier.')

  const start = points[0]?.time ?? session?.start_time?.getTime()
  const kind = (subSport && SUB_SPORT_LABELS[subSport]) || 'Sortie vélo'
  return { name: start ? `${kind} du ${dateFormat.format(start)}` : kind, points }
}
