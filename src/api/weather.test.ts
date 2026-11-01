import { compassPoint } from '@/lib/geo'
import { summarizeWeather, toUtcHour, type HourlyWeather } from './weather'

const hourly: HourlyWeather = {
  time: ['2026-09-12T06:00', '2026-09-12T07:00', '2026-09-12T08:00', '2026-09-12T09:00'],
  temperature_2m: [10, 12, 14, 16],
  precipitation: [0, 0.4, 0.6, 0],
  wind_speed_10m: [5, 10, 10, 5],
  wind_direction_10m: [180, 350, 10, 90],
}

describe('summarizeWeather', () => {
  it('ne garde que les heures de la sortie', () => {
    const s = summarizeWeather(hourly, '2026-09-12T07:00', '2026-09-12T08:00')
    expect(s).toMatchObject({ hours: 2, temperature: 13, windSpeed: 10, precipitation: 1 })
  })

  it('moyenne les directions comme des vecteurs (350° et 10° donnent le nord)', () => {
    const s = summarizeWeather(hourly, '2026-09-12T07:00', '2026-09-12T08:00')
    expect(compassPoint(s!.windDirection!)).toBe('N')
  })

  it('renvoie null hors de la plage horaire', () => {
    expect(summarizeWeather(hourly, '2026-09-13T00:00', '2026-09-13T23:00')).toBeNull()
  })
})

describe('toUtcHour', () => {
  it('tronque à l’heure UTC', () => {
    expect(toUtcHour(Date.parse('2026-09-12T07:43:10Z'))).toBe('2026-09-12T07:00')
  })
})

describe('compassPoint', () => {
  it('convertit des degrés en point cardinal', () => {
    expect([0, 44, 90, 225, 315, 359].map(compassPoint)).toEqual(['N', 'NE', 'E', 'SO', 'NO', 'N'])
  })
})
