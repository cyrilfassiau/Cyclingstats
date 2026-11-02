import { haversineKm } from '@/lib/geo'
import type { Ride, TrackSample } from './rideStats'

/** Fichier publié avec le site, chargé chez les visiteurs qui n'ont pas encore de sorties. */
export const DEMO_URL = '/demo/rides.json'
/** Rayon masqué autour du départ et de l'arrivée, comme les zones de confidentialité de Strava. */
export const PRIVACY_RADIUS_M = 500

export interface DemoFile {
  /** Change à chaque export : un visiteur qui a l'ancienne démo reçoit la nouvelle. */
  version: string
  privacyRadiusM: number
  rides: Ride[]
}

/**
 * Retire les points de la trace situés à moins de `radiusM` du départ ou de l'arrivée,
 * où qu'ils soient sur le parcours (une boucle repasse souvent près de chez soi).
 * Les statistiques de la sortie, calculées sur la trace complète, ne changent pas.
 */
export function hidePrivateEnds(track: TrackSample[], radiusM = PRIVACY_RADIUS_M) {
  const start = track[0]
  const end = track[track.length - 1]
  if (!start || !end) return track
  const radiusKm = radiusM / 1000
  return track.filter(
    (point) => haversineKm(point, start) > radiusKm && haversineKm(point, end) > radiusKm,
  )
}

/**
 * Prépare le fichier de démo à partir des sorties de l'auteur : traces masquées autour
 * du départ et de l'arrivée, sorties marquées « démo ». Une sortie trop courte pour garder
 * une trace hors des zones masquées est écartée.
 */
export function buildDemoFile(rides: Ride[], now = new Date(), radiusM = PRIVACY_RADIUS_M) {
  const kept: Ride[] = []
  let dropped = 0
  for (const ride of rides) {
    const track = hidePrivateEnds(ride.track, radiusM)
    if (track.length < 2) {
      dropped += 1
      continue
    }
    kept.push({ ...ride, demo: true, track })
  }
  const file: DemoFile = { version: now.toISOString(), privacyRadiusM: radiusM, rides: kept }
  return { file, dropped }
}

/** Vérifie la forme minimale d'un fichier de démo reçu du réseau. */
export function isDemoFile(value: unknown): value is DemoFile {
  if (typeof value !== 'object' || value === null) return false
  const file = value as Partial<DemoFile>
  return typeof file.version === 'string' && Array.isArray(file.rides)
}
