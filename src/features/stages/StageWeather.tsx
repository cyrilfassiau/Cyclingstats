import { useQuery } from '@tanstack/react-query'
import type { Stage } from '@/api/types'
import { geocodeQuery, summarizeWeather, weatherQuery } from '@/api/weather'
import { EmptyState, ErrorState } from '@/components/QueryState'
import { OpenMeteoCredit, WeatherFacts } from '@/features/rides/RideWeather'

/** Fenêtre d'arrivée approximative d'une étape, en heure locale. */
const FINISH_FROM = '14:00'
const FINISH_TO = '17:00'

/**
 * Météo à l'arrivée le jour de l'étape : deux requêtes dépendantes.
 * 1. géocodage de la ville d'arrivée ; 2. archive météo une fois les coordonnées connues.
 */
export function StageWeather({ stage }: { stage: Stage }) {
  const town = stage.finish.replace(/\s*\(.*\)$/, '')
  const place = useQuery(geocodeQuery(town))
  const weather = useQuery({
    ...weatherQuery({
      latitude: place.data?.latitude ?? 0,
      longitude: place.data?.longitude ?? 0,
      date: stage.date,
      timezone: 'auto',
    }),
    enabled: Boolean(place.data),
  })

  if (place.isError)
    return <ErrorState error={place.error} onRetry={() => place.refetch()} />
  if (place.isPending)
    return (
      <p aria-busy="true" className="meta">
        Recherche du lieu…
      </p>
    )
  if (!place.data)
    return <EmptyState>Lieu « {town} » introuvable pour la météo.</EmptyState>
  if (weather.isError)
    return (
      <ErrorState error={weather.error} onRetry={() => weather.refetch()} />
    )
  if (weather.isPending)
    return (
      <p aria-busy="true" className="meta">
        Chargement de la météo…
      </p>
    )

  const summary = summarizeWeather(
    weather.data,
    `${stage.date}T${FINISH_FROM}`,
    `${stage.date}T${FINISH_TO}`,
  )
  if (!summary)
    return <EmptyState>Pas de données météo pour ce jour.</EmptyState>

  return (
    <>
      <WeatherFacts summary={summary} />
      <p className="meta">
        À {place.data.name}
        {place.data.admin1 ? ` (${place.data.admin1})` : ''}, de{' '}
        {FINISH_FROM.replace(':00', ' h')} à {FINISH_TO.replace(':00', ' h')},
        heure locale.
      </p>
      <OpenMeteoCredit />
    </>
  )
}
