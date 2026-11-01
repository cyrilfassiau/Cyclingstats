import { queryOptions } from '@tanstack/react-query'
import { ApiError } from './client'

// Open-Meteo : API météo publique, sans clé (https://open-meteo.com, licence CC BY 4.0).

const HOURLY = 'temperature_2m,precipitation,wind_speed_10m,wind_direction_10m'
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
/** Le jeu « archive » est publié avec quelques jours de retard ; avant, on interroge « forecast ». */
const ARCHIVE_DELAY_DAYS = 6

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    throw new ApiError(
      response.status,
      `Open-Meteo a répondu ${response.status}`,
    )
  }
  return (await response.json()) as T
}

export interface HourlyWeather {
  time: string[]
  temperature_2m: (number | null)[]
  precipitation: (number | null)[]
  wind_speed_10m: (number | null)[]
  wind_direction_10m: (number | null)[]
}

interface WeatherResponse {
  hourly: HourlyWeather
}

export interface WeatherRequest {
  latitude: number
  longitude: number
  /** YYYY-MM-DD */
  date: string
  /** « GMT » pour comparer à des heures UTC, « auto » pour l'heure locale du lieu. */
  timezone: 'GMT' | 'auto'
}

function isRecent(date: string) {
  const ageDays = (Date.now() - Date.parse(`${date}T00:00:00Z`)) / 86_400_000
  return ageDays < ARCHIVE_DELAY_DAYS
}

export function weatherQuery({
  latitude,
  longitude,
  date,
  timezone,
}: WeatherRequest) {
  // Coordonnées arrondies : deux sorties au même endroit partagent l'entrée de cache.
  const lat = latitude.toFixed(2)
  const lon = longitude.toFixed(2)
  return queryOptions({
    queryKey: ['weather', lat, lon, date, timezone],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        start_date: date,
        end_date: date,
        hourly: HOURLY,
        wind_speed_unit: 'kmh',
        timezone,
      })
      const base = isRecent(date) ? FORECAST_URL : ARCHIVE_URL
      return getJson<WeatherResponse>(`${base}?${params}`, signal).then(
        (r) => r.hourly,
      )
    },
    staleTime: Infinity,
  })
}

export interface Place {
  name: string
  latitude: number
  longitude: number
  country_code: string
  admin1?: string
}

const PREFERRED_COUNTRIES = ['FR', 'ES', 'IT', 'CH', 'BE']

export function geocodeQuery(name: string) {
  return queryOptions({
    queryKey: ['geocode', name],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        name,
        count: '5',
        language: 'fr',
        format: 'json',
      })
      const { results = [] } = await getJson<{ results?: Place[] }>(
        `${GEOCODING_URL}?${params}`,
        signal,
      )
      // Les villes-étapes sont en Europe de l'Ouest : on écarte les homonymes lointains.
      return (
        results.find((p) => PREFERRED_COUNTRIES.includes(p.country_code)) ??
        results[0] ??
        null
      )
    },
    staleTime: Infinity,
  })
}

export interface WeatherSummary {
  hours: number
  temperature: number | null
  windSpeed: number | null
  /** Direction d'où vient le vent, en degrés (moyenne vectorielle). */
  windDirection: number | null
  precipitation: number
}

function mean(values: (number | null | undefined)[]) {
  const valid = values.filter((v): v is number => typeof v === 'number')
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

/**
 * Résume les heures comprises entre `from` et `to` (bornes incluses, même format que
 * `hourly.time`, ex. « 2026-09-12T07:00 »). Renvoie null si aucune heure ne correspond.
 */
export function summarizeWeather(
  hourly: HourlyWeather,
  from: string,
  to: string,
) {
  const indices = hourly.time.flatMap((t, i) =>
    t >= from && t <= to ? [i] : [],
  )
  if (indices.length === 0) return null

  const pick = (series: (number | null)[]) => indices.map((i) => series[i])
  const directions = pick(hourly.wind_direction_10m)
  const speeds = pick(hourly.wind_speed_10m)

  // La moyenne de 350° et 10° doit donner 0°, pas 180° : on moyenne des vecteurs.
  let x = 0
  let y = 0
  directions.forEach((deg, k) => {
    if (deg == null) return
    const weight = speeds[k] ?? 1
    x += Math.cos((deg * Math.PI) / 180) * weight
    y += Math.sin((deg * Math.PI) / 180) * weight
  })
  const hasDirection = x !== 0 || y !== 0

  return {
    hours: indices.length,
    temperature: mean(pick(hourly.temperature_2m)),
    windSpeed: mean(speeds),
    windDirection: hasDirection
      ? ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
      : null,
    precipitation: pick(hourly.precipitation).reduce<number>(
      (sum, v) => sum + (v ?? 0),
      0,
    ),
  } satisfies WeatherSummary
}

/** « 2026-09-12T07:43:10Z » -> « 2026-09-12T07:00 », au format des heures Open-Meteo (GMT). */
export function toUtcHour(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 13) + ':00'
}
