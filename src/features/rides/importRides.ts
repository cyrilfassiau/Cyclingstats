import type { UnzipFileInfo } from 'fflate'
import { SkippedActivity } from './activityErrors'
import { parseGpx } from './gpx'
import { computeRide, type Ride } from './rideStats'

export interface ActivitySource {
  fileName: string
  bytes: () => Promise<Uint8Array>
}

export interface ImportMessage {
  kind: 'ok' | 'skip' | 'error'
  text: string
}

export interface ImportSummary {
  added: Ride[]
  duplicates: number
  skipped: number
  failed: number
  messages: ImportMessage[]
}

export type ImportProgress = (done: number, total: number) => void

export const SAMPLE_FILES = [
  'tour-du-lac-annecy.gpx',
  'col-de-la-forclaz.gpx',
  'sortie-recup.gpx',
] as const

export function sampleSources(): ActivitySource[] {
  return SAMPLE_FILES.map((fileName) => ({
    fileName,
    bytes: async () => {
      const response = await fetch(`/samples/${fileName}`)
      if (!response.ok) throw new Error(`Exemple introuvable (${response.status})`)
      return new Uint8Array(await response.arrayBuffer())
    },
  }))
}

export function fileSource(file: File): ActivitySource {
  return { fileName: file.name, bytes: async () => new Uint8Array(await file.arrayBuffer()) }
}

const ACTIVITY = /\.(gpx|fit)$/i
const ARCHIVE = /\.zip$/i

const baseName = (path: string) => path.split('/').pop() ?? path

// fflate et le lecteur FIT (tables du profil FIT, ~250 Ko) ne sont chargés qu'au premier
// import d'une archive ou d'un FIT : la page Mes sorties reste légère.
async function unzipAsync(data: Uint8Array) {
  const { unzip } = await import('fflate')
  return new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    // Seuls les fichiers utiles sont décompressés : un export Garmin contient aussi
    // beaucoup de JSON (santé, sommeil…) qu'on ignore.
    const filter = (file: UnzipFileInfo) => ACTIVITY.test(file.name) || ARCHIVE.test(file.name)
    unzip(data, { filter }, (error, files) => (error ? reject(error) : resolve(files)))
  })
}

/**
 * Remplace chaque archive zip par les fichiers GPX et FIT qu'elle contient, y compris
 * dans les archives imbriquées (l'export Garmin range les activités dans des
 * « UploadedFiles_…zip » à l'intérieur de l'archive principale).
 */
export async function expandArchives(sources: ActivitySource[]) {
  const files: ActivitySource[] = []
  const messages: ImportMessage[] = []

  for (const source of sources) {
    if (ACTIVITY.test(source.fileName)) {
      files.push(source)
      continue
    }
    if (!ARCHIVE.test(source.fileName)) {
      messages.push({
        kind: 'error',
        text: `${source.fileName} : format non pris en charge (GPX, FIT ou ZIP).`,
      })
      continue
    }
    try {
      const entries = await unzipAsync(await source.bytes())
      const inner = Object.entries(entries).map(([path, data]) => ({
        fileName: baseName(path),
        bytes: async () => data,
      }))
      const nested = await expandArchives(inner)
      files.push(...nested.files)
      messages.push(...nested.messages)
    } catch {
      messages.push({ kind: 'error', text: `${source.fileName} : archive zip illisible.` })
    }
  }
  return { files, messages }
}

async function readActivity(source: ActivitySource) {
  const bytes = await source.bytes()
  if (/\.fit$/i.test(source.fileName)) {
    const { parseFit } = await import('./fit')
    return parseFit(bytes)
  }
  return parseGpx(new TextDecoder().decode(bytes))
}

/** Même départ à une minute près : c'est la même sortie, même exportée sous un autre format. */
function isDuplicate(ride: Ride, known: Ride[]) {
  return known.some((other) =>
    ride.startTime !== null && other.startTime !== null
      ? Math.abs(ride.startTime - other.startTime) < 60_000
      : other.fileName === ride.fileName,
  )
}

/** Au-delà, les messages individuels sont remplacés par le bilan chiffré. */
const MAX_DETAILED_MESSAGES = 12

/**
 * Importe des fichiers GPX, FIT et des archives zip. Un fichier invalide n'empêche jamais
 * les autres d'être importés ; le bilan compte les ajouts, doublons, activités ignorées
 * et échecs.
 */
export async function importActivities(
  sources: ActivitySource[],
  existing: Ride[],
  onProgress?: ImportProgress,
): Promise<ImportSummary> {
  const { files, messages: archiveMessages } = await expandArchives(sources)
  const summary: ImportSummary = {
    added: [],
    duplicates: 0,
    skipped: 0,
    failed: archiveMessages.length,
    messages: [...archiveMessages],
  }
  const known = [...existing]
  const detailed = files.length <= MAX_DETAILED_MESSAGES

  for (const [index, source] of files.entries()) {
    onProgress?.(index, files.length)
    // Rend la main au navigateur de temps en temps pour que la progression s'affiche.
    if (index % 20 === 19) await new Promise((resolve) => setTimeout(resolve))

    try {
      const { name, points } = await readActivity(source)
      const ride = computeRide(points, {
        id: crypto.randomUUID(),
        name: name ?? source.fileName.replace(/\.(gpx|fit)$/i, ''),
        fileName: source.fileName,
      })
      if (isDuplicate(ride, known)) {
        summary.duplicates += 1
        if (detailed)
          summary.messages.push({ kind: 'skip', text: `${source.fileName} : déjà importé.` })
        continue
      }
      known.push(ride)
      summary.added.push(ride)
      if (detailed) {
        summary.messages.push({
          kind: 'ok',
          text: `${source.fileName} : « ${ride.name} » ajoutée.`,
        })
      }
    } catch (error) {
      if (error instanceof SkippedActivity) {
        summary.skipped += 1
        if (detailed) {
          summary.messages.push({ kind: 'skip', text: `${source.fileName} : ${error.message}` })
        }
      } else {
        summary.failed += 1
        const reason = error instanceof Error ? error.message : 'lecture impossible.'
        summary.messages.push({ kind: 'error', text: `${source.fileName} : ${reason}` })
      }
    }
  }
  onProgress?.(files.length, files.length)
  return summary
}
