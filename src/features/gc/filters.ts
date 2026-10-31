import { compactParams, oneOf, positiveInt } from '@/lib/params'
import { normalizeText } from '@/lib/format'

export const GC_SORTS = ['rank', 'name'] as const
export type GcSort = (typeof GC_SORTS)[number]

export interface GcFilters {
  q: string
  team?: string
  nationality?: string
  sort: GcSort
  order: 'asc' | 'desc'
  page: number
}

export function parseGcFilters(params: URLSearchParams): GcFilters {
  return {
    q: params.get('q') ?? '',
    team: params.get('team') || undefined,
    nationality: params.get('nationality') || undefined,
    sort: oneOf(params.get('sort'), GC_SORTS) ?? 'rank',
    order: params.get('order') === 'desc' ? 'desc' : 'asc',
    page: positiveInt(params.get('page'), 1),
  }
}

export function serializeGcFilters(filters: GcFilters) {
  return compactParams({ ...filters }, { sort: 'rank', order: 'asc', page: 1 })
}

/** Ligne du classement général jointe avec le coureur et son équipe. */
export interface GcRow {
  rank: number
  riderId: string
  name: string
  nationality: string
  teamId: string
  teamName: string
  time: string
  gap?: string
}

export function filterGcRows(rows: GcRow[], filters: GcFilters) {
  const q = normalizeText(filters.q.trim())
  const result = rows.filter(
    (row) =>
      (!filters.team || row.teamId === filters.team) &&
      (!filters.nationality || row.nationality === filters.nationality) &&
      (!q || normalizeText(row.name).includes(q)),
  )

  const direction = filters.order === 'desc' ? -1 : 1
  return result.sort((a, b) =>
    filters.sort === 'name'
      ? direction * a.name.localeCompare(b.name, 'fr')
      : direction * (a.rank - b.rank),
  )
}
