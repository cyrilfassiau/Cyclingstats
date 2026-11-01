import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { allStagesQuery, metaQuery } from '@/api/queries'
import { ErrorState } from '@/components/QueryState'
import { formatDecimal, formatHours } from '@/lib/format'
import { useRides } from '@/store/rides'
import { closestStage, type Ride } from './rideStats'

/** « Ma sortie vs le Tour » : met la sortie à l'échelle des coureurs professionnels. */
export function RideVsTour({ ride }: { ride: Ride }) {
  const stages = useQuery(allStagesQuery)
  const meta = useQuery(metaQuery)
  const totalKm = useRides((s) =>
    s.rides.reduce((sum, r) => sum + r.distanceKm, 0),
  )

  if (stages.isError)
    return <ErrorState error={stages.error} onRetry={() => stages.refetch()} />
  if (meta.isError)
    return <ErrorState error={meta.error} onRetry={() => meta.refetch()} />
  if (!stages.data || !meta.data)
    return (
      <p aria-busy="true" className="meta">
        Chargement…
      </p>
    )

  const stage = closestStage(stages.data.items, ride.distanceKm)
  const tourSpeed = meta.data.averageSpeedKmh
  const share = (totalKm / meta.data.totalDistanceKm) * 100

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Mesure</span>
              </th>
              <th scope="col" className="num">
                Ma sortie
              </th>
              <th scope="col" className="num">
                Le Tour 2026
              </th>
            </tr>
          </thead>
          <tbody>
            {stage && (
              <tr>
                <th scope="row">
                  Distance{' '}
                  <span className="meta">
                    (étape la plus proche :{' '}
                    <Link to={`/stages/${stage.id}`}>
                      n° {stage.number}, {stage.start} → {stage.finish}
                    </Link>
                    )
                  </span>
                </th>
                <td className="num">{formatDecimal(ride.distanceKm)} km</td>
                <td className="num">{formatDecimal(stage.distanceKm)} km</td>
              </tr>
            )}
            <tr>
              <th scope="row">Vitesse moyenne</th>
              <td className="num">
                {ride.avgSpeedKmh === null
                  ? '–'
                  : `${formatDecimal(ride.avgSpeedKmh)} km/h`}
              </td>
              <td className="num">{formatDecimal(tourSpeed)} km/h</td>
            </tr>
            <tr>
              <th scope="row">
                Temps pour {formatDecimal(ride.distanceKm)} km
              </th>
              <td className="num">
                {ride.movingSeconds === null
                  ? '–'
                  : formatHours(ride.movingSeconds)}
              </td>
              <td className="num">
                {formatHours((ride.distanceKm / tourSpeed) * 3600)}
              </td>
            </tr>
            {stage && ride.avgSpeedKmh !== null && (
              <tr>
                <th scope="row">Temps pour l'étape n° {stage.number}</th>
                <td className="num">
                  {formatHours((stage.distanceKm / ride.avgSpeedKmh) * 3600)}
                </td>
                <td className="num">
                  {stage.winningTime ??
                    formatHours((stage.distanceKm / tourSpeed) * 3600)}
                  {!stage.winningTime && (
                    <span className="meta"> (à la moyenne du Tour)</span>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="meta">
        Toutes mes sorties : {formatDecimal(totalKm)} km, soit{' '}
        {formatDecimal(share)} % des{' '}
        {meta.data.totalDistanceKm.toLocaleString('fr-FR')} km du Tour. La
        vitesse du Tour est la moyenne du vainqueur sur les 21 étapes.
      </p>
    </>
  )
}
