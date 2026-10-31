import type { StageType } from '@/api/types'

export const STAGE_TYPES = [
  'flat',
  'hilly',
  'mountain',
  'individual-time-trial',
  'team-time-trial',
] as const satisfies readonly StageType[]

export const STAGE_TYPE_LABELS: Record<StageType, string> = {
  flat: 'Plat',
  hilly: 'Accidenté',
  mountain: 'Montagne',
  'individual-time-trial': 'CLM individuel',
  'team-time-trial': 'CLM par équipes',
}
