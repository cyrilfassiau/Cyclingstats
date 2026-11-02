import type { Stage } from '@/api/types'
import { GpxError, parseGpx } from './gpx'
import {
  closestStage,
  computeRide,
  elevationGain,
  groupByPeriod,
  sampleIndices,
} from './rideStats'

// 4 points sur un méridien, espacés de 0,01° de latitude (≈ 1,112 km), 1 point toutes les 2 min.
const GPX = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Test</name><trkseg>
    <trkpt lat="45.00" lon="6.0"><ele>400</ele><time>2026-09-12T08:00:00Z</time></trkpt>
    <trkpt lat="45.01" lon="6.0"><ele>410</ele><time>2026-09-12T08:02:00Z</time></trkpt>
    <trkpt lat="45.02" lon="6.0"><ele>430</ele><time>2026-09-12T08:04:00Z</time></trkpt>
    <trkpt lat="45.03" lon="6.0"><ele>420</ele><time>2026-09-12T08:06:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`

describe('parseGpx', () => {
  it('lit le nom, les coordonnées, l’altitude et l’heure', () => {
    const { name, points } = parseGpx(GPX)
    expect(name).toBe('Test')
    expect(points).toHaveLength(4)
    expect(points[1]).toEqual({
      lat: 45.01,
      lon: 6,
      ele: 410,
      time: Date.parse('2026-09-12T08:02:00Z'),
    })
  })

  it('refuse un fichier qui n’est pas du XML', () => {
    expect(() => parseGpx('pas du xml <')).toThrow(GpxError)
  })

  it('refuse un GPX sans trace', () => {
    expect(() =>
      parseGpx('<gpx xmlns="http://www.topografix.com/GPX/1/1"></gpx>'),
    ).toThrow(/moins de 2 points/)
  })
})

describe('computeRide', () => {
  const ride = computeRide(parseGpx(GPX).points, {
    id: 'r',
    name: 'Test',
    fileName: 't.gpx',
  })

  it('mesure la distance par haversine', () => {
    expect(ride.distanceKm).toBeCloseTo(3.336, 2)
  })

  it('calcule durée, temps en mouvement et vitesse moyenne', () => {
    expect(ride.totalSeconds).toBe(360)
    expect(ride.movingSeconds).toBe(360)
    expect(ride.avgSpeedKmh).toBeCloseTo(33.36, 1)
  })

  it('accepte un GPX sans horodatage', () => {
    const noTime = parseGpx(GPX.replace(/<time>[^<]*<\/time>/g, '')).points
    const r = computeRide(noTime, { id: 'r', name: 'Test', fileName: 't.gpx' })
    expect(r.startTime).toBeNull()
    expect(r.avgSpeedKmh).toBeNull()
    expect(r.distanceKm).toBeGreaterThan(3)
  })
})

describe('elevationGain', () => {
  it('ne compte que les montées', () => {
    const plateau = (ele: number) => Array<number>(20).fill(ele)
    expect(
      elevationGain([...plateau(100), ...plateau(200), ...plateau(100)]),
    ).toBeCloseTo(100, 6)
  })

  it('ignore le bruit de l’altimètre', () => {
    const noisy = Array.from({ length: 200 }, (_, i) => 300 + (i % 2 ? 1 : -1))
    expect(elevationGain(noisy)).toBeLessThan(5)
  })
})

describe('sampleIndices', () => {
  it('garde le premier et le dernier point', () => {
    const indices = sampleIndices(1000, 5)
    expect(indices).toEqual([0, 250, 500, 749, 999])
  })
})

describe('groupByPeriod', () => {
  const base = computeRide(parseGpx(GPX).points, { id: 'a', name: 'A', fileName: 'a.gpx' })
  const october = { ...base, id: 'b', startTime: Date.parse('2026-10-03T08:00:00Z') }
  const lastYear = { ...base, id: 'd', startTime: Date.parse('2025-06-01T08:00:00Z') }
  const undated = { ...base, id: 'e', startTime: null }
  const rides = [base, { ...base, id: 'c' }, october, lastYear, undated]

  it('additionne les sorties d’un même mois', () => {
    expect(groupByPeriod(rides, 'month').map((m) => [m.period, m.count])).toEqual([
      ['2025-06', 1],
      ['2026-09', 2],
      ['2026-10', 1],
    ])
  })

  it('additionne les sorties d’une même année', () => {
    const years = groupByPeriod(rides, 'year')
    expect(years.map((y) => [y.period, y.count])).toEqual([
      ['2025', 1],
      ['2026', 3],
    ])
    expect(years[1]!.distanceKm).toBeCloseTo(base.distanceKm * 3, 6)
  })
})

describe('closestStage', () => {
  it('choisit l’étape de distance la plus proche', () => {
    const stages = [
      { number: 1, distanceKm: 19.6 },
      { number: 2, distanceKm: 168.5 },
    ] as Stage[]
    expect(closestStage(stages, 40)?.number).toBe(1)
    expect(closestStage(stages, 120)?.number).toBe(2)
  })
})
