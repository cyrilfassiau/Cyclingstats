import { makeFit } from '@/test/fitFixture'
import { SkippedActivity } from './activityErrors'
import { parseFit } from './fit'

describe('parseFit', () => {
  it('lit une sortie vélo : positions en degrés, altitude, heure', async () => {
    const { name, points } = await parseFit(makeFit())
    expect(name).toBe('Route du 12 sept. 2026')
    expect(points).toHaveLength(3)
    expect(points[1]!.lat).toBeCloseTo(45.01, 6)
    expect(points[1]!.lon).toBeCloseTo(6, 6)
    expect(points[1]!.ele).toBeCloseTo(410, 1)
    expect(points[1]!.time).toBe(Date.parse('2026-09-12T08:02:00Z'))
  })

  it('ignore les autres sports', async () => {
    await expect(parseFit(makeFit({ sport: 'running', subSport: 'generic' }))).rejects.toThrow(
      /course à pied/,
    )
  })

  it('ignore le home trainer', async () => {
    await expect(parseFit(makeFit({ subSport: 'indoor_cycling' }))).rejects.toBeInstanceOf(
      SkippedActivity,
    )
  })

  it('ignore une sortie sans position GPS', async () => {
    await expect(parseFit(makeFit({ points: [null, null, null] }))).rejects.toThrow(
      /pas de trace GPS/,
    )
  })

  it('rejette un fichier qui n’est pas un FIT', async () => {
    await expect(parseFit(new TextEncoder().encode('pas un fit'))).rejects.toThrow()
  })
})
