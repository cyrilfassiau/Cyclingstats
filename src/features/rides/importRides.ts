import { GpxError, parseGpx } from './gpx'
import { computeRide, type Ride } from './rideStats'

export interface GpxSource {
  fileName: string
  read: () => Promise<string>
}

export interface ImportResult {
  added: Ride[]
  messages: { kind: 'ok' | 'error'; text: string }[]
}

export const SAMPLE_FILES = [
  'tour-du-lac-annecy.gpx',
  'col-de-la-forclaz.gpx',
  'sortie-recup.gpx',
] as const

export function sampleSources(): GpxSource[] {
  return SAMPLE_FILES.map((fileName) => ({
    fileName,
    read: async () => {
      const response = await fetch(`/samples/${fileName}`)
      if (!response.ok)
        throw new Error(`Exemple introuvable (${response.status})`)
      return response.text()
    },
  }))
}

/** Lit et analyse chaque fichier ; un fichier invalide n'empêche pas les autres d'être importés. */
export async function importGpx(
  sources: GpxSource[],
  existing: Ride[],
): Promise<ImportResult> {
  const result: ImportResult = { added: [], messages: [] }
  const known = [...existing]

  for (const source of sources) {
    try {
      const { name, points } = parseGpx(await source.read())
      const ride = computeRide(points, {
        id: crypto.randomUUID(),
        name: name ?? source.fileName.replace(/\.gpx$/i, ''),
        fileName: source.fileName,
      })
      const duplicate = known.some(
        (r) => r.fileName === ride.fileName && r.startTime === ride.startTime,
      )
      if (duplicate) {
        result.messages.push({
          kind: 'error',
          text: `${source.fileName} : déjà importé.`,
        })
        continue
      }
      known.push(ride)
      result.added.push(ride)
      result.messages.push({
        kind: 'ok',
        text: `${source.fileName} : « ${ride.name} » ajoutée.`,
      })
    } catch (error) {
      const reason =
        error instanceof GpxError
          ? error.message
          : 'Lecture impossible du fichier.'
      result.messages.push({
        kind: 'error',
        text: `${source.fileName} : ${reason}`,
      })
    }
  }
  return result
}
