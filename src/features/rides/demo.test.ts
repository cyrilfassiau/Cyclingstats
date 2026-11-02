import { buildDemoFile, hidePrivateEnds, isDemoFile } from './demo'
import type { Ride, TrackSample } from './rideStats'

// Points espacés de 0,001° de latitude (≈ 111 m) le long d'un méridien
const point = (i: number): TrackSample => ({
  lat: 45 + i * 0.001,
  lon: 6,
  ele: 400,
  km: i * 0.111,
  speed: 25,
})

const ride = (track: TrackSample[]): Ride => ({
  id: 'r',
  name: 'Sortie',
  fileName: 'sortie.fit',
  startTime: 0,
  endTime: 3_600_000,
  distanceKm: 42,
  elevationGain: 500,
  movingSeconds: 3600,
  totalSeconds: 3600,
  avgSpeedKmh: 42,
  maxSpeedKmh: 60,
  track,
})

describe('hidePrivateEnds', () => {
  it('masque les 500 m autour du départ et de l’arrivée', () => {
    const track = Array.from({ length: 30 }, (_, i) => point(i)) // ≈ 3,2 km en ligne droite
    const hidden = hidePrivateEnds(track, 500)
    // 0,001° ≈ 111 m : les points 0 à 4 (≤ 445 m) et 25 à 29 sont retirés
    expect(hidden[0]).toEqual(point(5))
    expect(hidden.at(-1)).toEqual(point(24))
  })

  it('masque aussi le passage d’une boucle près du départ', () => {
    const loop = [...Array.from({ length: 20 }, (_, i) => point(i)), point(2), point(15), point(0)]
    expect(hidePrivateEnds(loop, 500).some((p) => p.lat === point(2).lat)).toBe(false)
  })
})

describe('buildDemoFile', () => {
  it('marque les sorties « démo », garde leurs statistiques et écarte les trop courtes', () => {
    const long = ride(Array.from({ length: 30 }, (_, i) => point(i)))
    const short = { ...ride([point(0), point(1), point(2)]), id: 'court' }
    const { file, dropped } = buildDemoFile([long, short], new Date('2026-11-02T10:00:00Z'))

    expect(dropped).toBe(1)
    expect(file.version).toBe('2026-11-02T10:00:00.000Z')
    expect(file.rides).toHaveLength(1)
    expect(file.rides[0]).toMatchObject({ demo: true, distanceKm: 42, elevationGain: 500 })
    expect(isDemoFile(JSON.parse(JSON.stringify(file)))).toBe(true)
  })

  it('refuse un contenu qui n’est pas un fichier de démo', () => {
    expect(isDemoFile('<!doctype html>')).toBe(false)
    expect(isDemoFile({ rides: [] })).toBe(false)
  })
})
