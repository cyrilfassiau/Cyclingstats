import type { StageType } from '@/api/types'
import { compactParams, oneOf } from '@/lib/params'
import { STAGE_TYPES } from './labels'

export const STAGE_SORTS = ['number', 'distanceKm'] as const
export type StageSort = (typeof STAGE_SORTS)[number]

export interface StageFilters {
  type?: StageType
  sort: StageSort
  order: 'asc' | 'desc'
}

export function parseStageFilters(params: URLSearchParams): StageFilters {
  return {
    type: oneOf(params.get('type'), STAGE_TYPES),
    sort: oneOf(params.get('sort'), STAGE_SORTS) ?? 'number',
    order: params.get('order') === 'desc' ? 'desc' : 'asc',
  }
}

export function serializeStageFilters(filters: StageFilters) {
  return compactParams({ ...filters }, { sort: 'number', order: 'asc' })
}
