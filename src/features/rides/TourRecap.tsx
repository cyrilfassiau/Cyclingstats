import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { allStagesQuery, metaQuery } from '@/api/queries'
import { ErrorState } from '@/components/QueryState'
import { formatDecimal, formatHours } from '@/lib/format'
import type { Ride } from './rideStats'
import { computeTourRecap } from './tourShare'

const percent = (value: number) => `${formatDecimal(value)} %`

/** Récapitulatif de toutes les sorties, mises à l'échelle du Tour de France 2026. */
export function TourRecap({ rides }: { rides: Ride[] }) {
  const stages = useQuery(allStagesQuery)
  const meta = useQuery(metaQuery)

  if (stages.isError) return <ErrorState error={stages.error} onRetry={() => stages.refetch()} />
  if (meta.isError) return <ErrorState error={meta.error} onRetry={() => meta.refetch()} />
  if (!stages.data || !meta.data) {
    return (
      <p aria-busy="true" className="meta">
        Chargement du Tour…
      </p>
    )
  }

  const recap = computeTourRecap(rides, stages.data.items, meta.data)
  const ordered = [...stages.data.items].sort((a, b) => a.number - b.number)
  // Sur la barre, seul le tour en cours est représenté (au-delà de 100 %, elle repart de zéro).
  const lapPct = recap.laps > 0 && recap.sharePct % 100 === 0 ? 100 : recap.sharePct % 100

  return (
    <>
      <div className="tour-recap-head">
        <p className="tour-share">
          <strong>{percent(recap.sharePct)}</strong> du Tour de France 2026
        </p>
        <p className="meta">
          {formatDecimal(recap.totalKm)} km sur {formatDecimal(recap.tourKm)} km
          {recap.laps > 0
            ? ` · Tour bouclé ${recap.laps > 1 ? `${recap.laps} fois` : ''}`.trimEnd()
            : ` · encore ${formatDecimal(recap.remainingKm)} km jusqu'aux Champs-Élysées`}
        </p>
      </div>

      <div
        className="tour-progress"
        role="progressbar"
        aria-label="Part du parcours du Tour couverte par mes sorties"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(recap.sharePct, 100))}
        aria-valuetext={`${percent(recap.sharePct)} du Tour`}
      >
        <div className="tour-progress-fill" style={{ width: `${lapPct}%` }} />
        {recap.stageEnds.map((left) => (
          <span key={left} className="tour-progress-tick" style={{ left: `${left}%` }} />
        ))}
      </div>
      <div className="tour-progress-ends meta" aria-hidden="true">
        <span>{ordered[0]?.start}</span>
        <span>{ordered.at(-1)?.finish}</span>
      </div>

      {recap.current && (
        <p className="tour-position">
          {recap.stagesCompleted > 0
            ? `${recap.stagesCompleted} étape${recap.stagesCompleted > 1 ? 's' : ''} bouclée${recap.stagesCompleted > 1 ? 's' : ''}${recap.laps > 0 ? ' sur le tour en cours' : ''}. `
            : ''}
          En route sur l'étape{' '}
          <Link to={`/stages/${recap.current.stage.id}`}>
            n° {recap.current.stage.number}, {recap.current.stage.start} →{' '}
            {recap.current.stage.finish}
          </Link>{' '}
          : {formatDecimal(recap.current.doneKm)} km sur{' '}
          {formatDecimal(recap.current.stage.distanceKm)}.
        </p>
      )}

      <div className="table-wrap recap-table">
        <table>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Mesure</span>
              </th>
              <th scope="col" className="num">
                Mes {recap.rideCount} sortie{recap.rideCount > 1 ? 's' : ''}
              </th>
              <th scope="col" className="num">
                Le Tour 2026
              </th>
              <th scope="col" className="num">
                Part
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Distance</th>
              <td className="num">{formatDecimal(recap.totalKm)} km</td>
              <td className="num">{formatDecimal(recap.tourKm)} km</td>
              <td className="num">{percent(recap.sharePct)}</td>
            </tr>
            <tr>
              <th scope="row">
                Temps en selle <span className="meta">(Tour : temps du vainqueur)</span>
              </th>
              <td className="num">{formatHours(recap.movingSeconds)}</td>
              <td className="num">{formatHours(recap.winnerSeconds)}</td>
              <td className="num">{percent(recap.timeSharePct)}</td>
            </tr>
            <tr>
              <th scope="row">Vitesse moyenne</th>
              <td className="num">
                {recap.avgSpeedKmh === null ? '–' : `${formatDecimal(recap.avgSpeedKmh)} km/h`}
              </td>
              <td className="num">{formatDecimal(recap.tourSpeedKmh)} km/h</td>
              <td className="num">
                {recap.avgSpeedKmh === null
                  ? '–'
                  : percent((recap.avgSpeedKmh / recap.tourSpeedKmh) * 100)}
              </td>
            </tr>
            {recap.longestStage && (
              <tr>
                <th scope="row">
                  Plus longue sortie{' '}
                  <span className="meta">
                    (Tour : étape n° {recap.longestStage.number}, {recap.longestStage.start} →{' '}
                    {recap.longestStage.finish})
                  </span>
                </th>
                <td className="num">{formatDecimal(recap.longestRideKm)} km</td>
                <td className="num">{formatDecimal(recap.longestStage.distanceKm)} km</td>
                <td className="num">
                  {percent((recap.longestRideKm / recap.longestStage.distanceKm) * 100)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="meta">
        {recap.projectedTourSeconds !== null &&
          `À ma vitesse moyenne, boucler les ${formatDecimal(recap.tourKm)} km du Tour me prendrait ${formatHours(recap.projectedTourSeconds)} en selle, contre ${formatHours(recap.winnerSeconds)} pour le vainqueur. `}
        Le jeu de données ne contient pas le dénivelé des étapes : il n'est donc pas comparé.
      </p>
    </>
  )
}
