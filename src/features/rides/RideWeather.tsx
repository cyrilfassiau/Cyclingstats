import { useQuery } from '@tanstack/react-query'
import { summarizeWeather, toUtcHour, weatherQuery } from '@/api/weather'
import { EmptyState, ErrorState } from '@/components/QueryState'
import { formatDecimal } from '@/lib/format'
import { compassPoint } from '@/lib/geo'
import type { Ride } from './rideStats'

export function WeatherFacts({
  summary,
}: {
  summary: NonNullable<ReturnType<typeof summarizeWeather>>
}) {
  return (
    <dl className="weather-facts">
      <div>
        <dt>Température</dt>
        <dd>
          {summary.temperature === null
            ? '–'
            : `${formatDecimal(summary.temperature)} °C`}
        </dd>
      </div>
      <div>
        <dt>Vent moyen</dt>
        <dd>
          {summary.windSpeed === null
            ? '–'
            : `${Math.round(summary.windSpeed)} km/h`}
          {summary.windDirection !== null && (
            <span className="wind-dir">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{
                  transform: `rotate(${summary.windDirection + 180}deg)`,
                }}
              >
                <path d="M12 3l6 16-6-4-6 4z" fill="currentColor" />
              </svg>
              de {compassPoint(summary.windDirection)}
            </span>
          )}
        </dd>
      </div>
      <div>
        <dt>Précipitations</dt>
        <dd>{formatDecimal(summary.precipitation)} mm</dd>
      </div>
    </dl>
  )
}

export function OpenMeteoCredit() {
  return (
    <p className="meta credit">
      Météo :{' '}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
        Open-Meteo.com
      </a>{' '}
      (CC BY 4.0)
    </p>
  )
}

export function RideWeather({ ride }: { ride: Ride }) {
  const start = ride.track[0]
  const canQuery =
    ride.startTime !== null && ride.endTime !== null && start !== undefined
  const weather = useQuery({
    ...weatherQuery({
      latitude: start?.lat ?? 0,
      longitude: start?.lon ?? 0,
      date: new Date(ride.startTime ?? 0).toISOString().slice(0, 10),
      timezone: 'GMT',
    }),
    enabled: canQuery,
  })

  if (!canQuery)
    return (
      <EmptyState>
        Pas d'horodatage dans ce GPX : météo indisponible.
      </EmptyState>
    )
  if (weather.isPending)
    return (
      <p aria-busy="true" className="meta">
        Chargement de la météo…
      </p>
    )
  if (weather.isError)
    return (
      <ErrorState error={weather.error} onRetry={() => weather.refetch()} />
    )

  const summary = summarizeWeather(
    weather.data,
    toUtcHour(ride.startTime!),
    toUtcHour(ride.endTime!),
  )
  if (!summary)
    return <EmptyState>Pas de données météo pour ces horaires.</EmptyState>

  return (
    <>
      <WeatherFacts summary={summary} />
      <p className="meta">
        Moyenne sur {summary.hours} heure{summary.hours > 1 ? 's' : ''} de
        sortie, au point de départ.
      </p>
      <OpenMeteoCredit />
    </>
  )
}
