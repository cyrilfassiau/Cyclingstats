import type { LatLon } from '@/lib/geo'

export interface TrackPoint extends LatLon {
  ele: number | null
  /** Horodatage en millisecondes (Date.getTime), absent dans certains fichiers. */
  time: number | null
}

export interface ParsedGpx {
  name: string | null
  points: TrackPoint[]
}

export class GpxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GpxError'
  }
}

function numberOrNull(text: string | null | undefined) {
  if (text == null || text.trim() === '') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/**
 * Lit un fichier GPX dans le navigateur (DOMParser, aucun envoi réseau).
 * Prend les points de trace (<trkpt>), ou à défaut ceux d'un itinéraire (<rtept>).
 */
export function parseGpx(xml: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new GpxError("Ce fichier n'est pas un XML valide.")
  }
  if (doc.documentElement.localName !== 'gpx') {
    throw new GpxError("Ce fichier n'est pas un GPX.")
  }

  let nodes = Array.from(doc.getElementsByTagName('trkpt'))
  if (nodes.length === 0) nodes = Array.from(doc.getElementsByTagName('rtept'))

  const points: TrackPoint[] = []
  for (const node of nodes) {
    const lat = numberOrNull(node.getAttribute('lat'))
    const lon = numberOrNull(node.getAttribute('lon'))
    if (lat === null || lon === null) continue
    const timeText = node.getElementsByTagName('time')[0]?.textContent
    const time = timeText ? Date.parse(timeText) : NaN
    points.push({
      lat,
      lon,
      ele: numberOrNull(node.getElementsByTagName('ele')[0]?.textContent),
      time: Number.isNaN(time) ? null : time,
    })
  }

  if (points.length < 2) {
    throw new GpxError(
      'Ce GPX ne contient pas de trace exploitable (moins de 2 points).',
    )
  }

  const name =
    doc.querySelector('trk > name')?.textContent?.trim() ||
    doc.querySelector('metadata > name')?.textContent?.trim() ||
    null

  return { name, points }
}
