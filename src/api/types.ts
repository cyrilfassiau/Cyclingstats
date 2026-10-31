export type StageType = 'flat' | 'hilly' | 'mountain' | 'itt' | 'ttt'

export interface Stage {
  id: number
  edition: number
  number: number
  date: string
  departure: string
  arrival: string
  distanceKm: number
  type: StageType
}

export interface Paginated<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}
