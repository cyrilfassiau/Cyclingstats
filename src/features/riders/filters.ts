import type { RidersPageQuery } from '@/api/riders'
import { compactParams, positiveInt } from '@/lib/params'

export function parseRiderFilters(params: URLSearchParams): RidersPageQuery {
  return {
    q: params.get('q') ?? '',
    team: params.get('team') || undefined,
    nationality: params.get('nationality') || undefined,
    page: positiveInt(params.get('page'), 1),
  }
}

export function serializeRiderFilters(filters: RidersPageQuery) {
  return compactParams({ ...filters }, { page: 1 })
}
