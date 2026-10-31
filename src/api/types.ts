// Types des réponses de la fausse API (src/mocks/data/db.json, Tour de France 2026)

export type StageType =
  | 'team-time-trial'
  | 'individual-time-trial'
  | 'flat'
  | 'hilly'
  | 'mountain'

export interface Team {
  id: string
  code: string
  name: string
  category: 'WorldTeam' | 'ProTeam'
}

export interface Rider {
  id: string
  name: string
  /** Code pays à 3 lettres tel qu'utilisé par la source (ex. SLO, FRA, DEN) */
  nationality: string
  teamId: string
  status: 'finished' | 'abandoned'
  finalRank: number | null
  abandonedOnStage?: number
  abandonReason?: string
}

export interface StageFinisher {
  position: number
  riderId: string
}

export interface Stage {
  id: number
  number: number
  /** Format ISO YYYY-MM-DD */
  date: string
  start: string
  finish: string
  distanceKm: number
  /** Présent si l'étape a été raccourcie */
  originalDistanceKm?: number
  type: StageType
  /** null pour le contre-la-montre par équipes (étape 1) */
  winnerRiderId: string | null
  winnerTeamId: string | null
  yellowJerseyRiderId: string
  /** Positions vérifiées uniquement (podium partiel) */
  topFinishers: StageFinisher[]
  notes: string
  winningTime?: string
  averageSpeedKmh?: number
}

interface ClassificationBase {
  id: number
  rank: number
}

export interface GcEntry extends ClassificationBase {
  riderId: string
  teamId: string
  /** Temps total h:mm:ss */
  time: string
  totalSeconds: number
  gapSeconds: number
  /** Écart formaté, absent pour le 1er */
  gap?: string
}

export interface PointsEntry extends ClassificationBase {
  riderId: string
  teamId: string
  points: number
}

export interface YouthEntry extends ClassificationBase {
  riderId: string
  teamId: string
  gapSeconds: number
  gap?: string
  /** Uniquement pour le 1er */
  time?: string
  totalSeconds?: number
}

export interface TeamClassificationEntry extends ClassificationBase {
  teamId: string
  gapSeconds: number
  gap?: string
  time?: string
  totalSeconds?: number
}

export interface GcLead {
  id: number
  afterStage: number
  leaderId: string
  secondId: string
  leadSeconds: number
}

export interface TourMeta {
  id: number
  name: string
  edition: number
  startDate: string
  endDate: string
  grandDepart: string
  finish: string
  totalDistanceKm: number
  restDays: { date: string; place: string }[]
  startersCount: number
  finishersCount: number
  winnerRiderId: string
  winningTime: string
  averageSpeedKmh: number
  jerseys: {
    yellow: string
    green: string
    polkaDot: string
    white: string
    combativity: string
    team: string
  }
  sources: string[]
  dataNotes: string[]
}

export interface ListResult<T> {
  items: T[]
  /** Nombre total d'éléments correspondant aux filtres (en-tête X-Total-Count) */
  total: number
}
