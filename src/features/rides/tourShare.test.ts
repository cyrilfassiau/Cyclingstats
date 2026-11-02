import type { Stage, TourMeta } from '@/api/types'
import type { Ride } from './rideStats'
import { computeTourRecap, durationToSeconds } from './tourShare'

const stage = (number: number, distanceKm: number) =>
  ({ id: number, number, distanceKm, start: `A${number}`, finish: `B${number}` }) as Stage

// Un « Tour » de 3 étapes : 100 + 50 + 150 = 300 km
const stages = [stage(2, 50), stage(1, 100), stage(3, 150)]
const meta = { totalDistanceKm: 300, winningTime: '10:00:00', averageSpeedKmh: 30 } as TourMeta

const ride = (distanceKm: number, movingSeconds: number | null = distanceKm * 120): Ride => ({
  id: String(Math.random()),
  name: 'Sortie',
  fileName: 'sortie.gpx',
  startTime: null,
  endTime: null,
  distanceKm,
  elevationGain: null,
  movingSeconds,
  totalSeconds: movingSeconds,
  avgSpeedKmh: null,
  maxSpeedKmh: null,
  track: [],
})

describe('computeTourRecap', () => {
  it('pose les kilomètres sur les étapes, dans l’ordre du parcours', () => {
    const recap = computeTourRecap([ride(60), ride(60)], stages, meta)
    expect(recap.totalKm).toBe(120)
    expect(recap.sharePct).toBe(40)
    expect(recap.stagesCompleted).toBe(1)
    expect(recap.current?.stage.number).toBe(2)
    expect(recap.current?.doneKm).toBe(20)
    expect(recap.remainingKm).toBe(180)
    expect(recap.stageEnds.map(Math.round)).toEqual([33, 50])
  })

  it('compare temps et vitesse au vainqueur du Tour', () => {
    // 120 km en 4 h : 30 km/h, soit 40 % des 10 h du vainqueur
    const recap = computeTourRecap([ride(60), ride(60)], stages, meta)
    expect(recap.avgSpeedKmh).toBe(30)
    expect(recap.timeSharePct).toBe(40)
    expect(recap.projectedTourSeconds).toBe(10 * 3600)
    expect(recap.longestRideKm).toBe(60)
    expect(recap.longestStage?.number).toBe(3)
  })

  it('compte les tours complets au-delà de 100 %', () => {
    const recap = computeTourRecap([ride(400)], stages, meta)
    expect(recap.sharePct).toBeCloseTo(133.3, 1)
    expect(recap.laps).toBe(1)
    // 400 km = un Tour complet + l'étape 1 (100 km) : la suivante démarre
    expect(recap.stagesCompleted).toBe(1)
    expect(recap.current?.stage.number).toBe(2)
    expect(recap.current?.doneKm).toBe(0)
    expect(recap.remainingKm).toBe(0)
  })

  it('ignore les sorties sans horodatage pour la vitesse', () => {
    const recap = computeTourRecap([ride(100, null)], stages, meta)
    expect(recap.avgSpeedKmh).toBeNull()
    expect(recap.projectedTourSeconds).toBeNull()
    expect(recap.totalKm).toBe(100)
  })
})

describe('durationToSeconds', () => {
  it('convertit un temps h:mm:ss', () => {
    expect(durationToSeconds('73:56:26')).toBe(266186)
  })
})
