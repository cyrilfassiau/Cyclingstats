import type { Stage } from '@/api/types'
import { buildRiderStats, compareByGc, type StatsSources } from './stats'

const stage = (number: number, winner: string | null, yellow: string): Stage => ({
  id: number,
  number,
  date: '2026-07-04',
  start: 'A',
  finish: 'B',
  distanceKm: 100,
  type: 'flat',
  winnerRiderId: winner,
  winnerTeamId: winner ? null : 'visma',
  yellowJerseyRiderId: yellow,
  topFinishers: [],
  notes: '',
})

const sources: StatsSources = {
  riders: [
    { id: 'pog', name: 'Tadej Pogačar', nationality: 'SLO', teamId: 'uae', status: 'finished', finalRank: 1 },
    { id: 'vin', name: 'Jonas Vingegaard', nationality: 'DEN', teamId: 'visma', status: 'finished', finalRank: 2 },
    { id: 'aba', name: 'Abandon Rider', nationality: 'FRA', teamId: 'visma', status: 'abandoned', finalRank: null },
  ],
  teams: [
    { id: 'uae', code: 'UAE', name: 'UAE Team Emirates XRG', category: 'WorldTeam' },
    { id: 'visma', code: 'VIS', name: 'Visma–Lease a Bike', category: 'WorldTeam' },
  ],
  gc: [
    { id: 1, rank: 1, riderId: 'pog', teamId: 'uae', time: '73:56:26', totalSeconds: 266186, gapSeconds: 0 },
    { id: 2, rank: 2, riderId: 'vin', teamId: 'visma', time: '', totalSeconds: 266336, gapSeconds: 150, gap: '2:30' },
  ],
  points: [{ id: 1, rank: 3, riderId: 'pog', teamId: 'uae', points: 210 }],
  mountains: [],
  youth: [],
  stages: [stage(1, null, 'vin'), stage(2, 'pog', 'vin'), stage(3, 'pog', 'pog')],
}

describe('buildRiderStats', () => {
  const stats = buildRiderStats(sources)

  it('compte les victoires et les jours en jaune', () => {
    expect(stats.get('pog')).toMatchObject({ stageWins: 2, yellowDays: 1 })
    expect(stats.get('vin')).toMatchObject({ stageWins: 0, yellowDays: 2 })
  })

  it('ne crédite pas de victoire individuelle au contre-la-montre par équipes', () => {
    const total = [...stats.values()].reduce((sum, s) => sum + s.stageWins, 0)
    expect(total).toBe(2)
  })

  it('joint équipe, classement général et classements annexes', () => {
    expect(stats.get('pog')).toMatchObject({
      teamName: 'UAE Team Emirates XRG',
      gcRank: 1,
      pointsRank: 3,
      points: 210,
      mountainsRank: undefined,
    })
  })

  it('range les abandons après les classés', () => {
    const order = [...stats.values()].sort(compareByGc).map((s) => s.rider.id)
    expect(order).toEqual(['pog', 'vin', 'aba'])
  })
})
