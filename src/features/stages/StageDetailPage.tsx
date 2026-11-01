import { Link, useParams } from 'react-router-dom'
import { ApiError } from '@/api/client'
import { useRidersById, useTeamsById } from '@/api/riders'
import { useStage } from '@/api/stages'
import { JerseyIcon } from '@/components/Icons'
import { EmptyState, ErrorState } from '@/components/QueryState'
import { Panel } from '@/components/Panel'
import { Rank } from '@/components/Rank'
import { formatDate, formatKm } from '@/lib/format'
import { STAGE_TYPE_LABELS } from './labels'
import { StageWeather } from './StageWeather'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function StageDetailPage() {
  const id = Number(useParams().id)
  const stage = useStage(id)
  const riders = useRidersById()
  const teams = useTeamsById()
  useDocumentTitle(
    stage.data
      ? `Étape ${stage.data.number} : ${stage.data.start} → ${stage.data.finish}`
      : 'Étape',
  )

  if (stage.isPending) return <p aria-busy="true">Chargement de l'étape…</p>
  if (stage.isError) {
    if (stage.error instanceof ApiError && stage.error.status === 404) {
      return <EmptyState>Cette étape n'existe pas.</EmptyState>
    }
    return <ErrorState error={stage.error} onRetry={() => stage.refetch()} />
  }

  const s = stage.data
  const riderName = (riderId: string) => riders.data?.get(riderId)?.name ?? riderId
  const winner = s.winnerRiderId
    ? riderName(s.winnerRiderId)
    : s.winnerTeamId
      ? (teams.data?.get(s.winnerTeamId)?.name ?? s.winnerTeamId)
      : '—'

  return (
    <article aria-labelledby="stage-title">
      <p>
        <Link to="/stages">← Toutes les étapes</Link>
      </p>
      <h1 id="stage-title">
        Étape {s.number} : {s.start} → {s.finish}
      </h1>
      <p className="subtitle">
        {formatDate(s.date)} · {formatKm(s.distanceKm)}
        {s.originalDistanceKm && ` (prévue ${formatKm(s.originalDistanceKm)})`} ·{' '}
        <span className={`badge badge-${s.type}`}>{STAGE_TYPE_LABELS[s.type]}</span>
      </p>

      <dl className="facts">
        <div>
          <dt>Vainqueur</dt>
          <dd>{winner}</dd>
        </div>
        <div>
          <dt>Maillot jaune à l'arrivée</dt>
          <dd className="with-icon">
            <JerseyIcon kind="yellow" />
            {riderName(s.yellowJerseyRiderId)}
          </dd>
        </div>
        {s.winningTime && (
          <div>
            <dt>Temps du vainqueur</dt>
            <dd>{s.winningTime}</dd>
          </div>
        )}
        {s.averageSpeedKmh && (
          <div>
            <dt>Vitesse moyenne</dt>
            <dd>{s.averageSpeedKmh} km/h</dd>
          </div>
        )}
      </dl>

      <Panel title="Météo à l'arrivée">
        <StageWeather stage={s} />
      </Panel>

      <h2>Arrivée</h2>
      {s.topFinishers.length === 0 ? (
        <EmptyState>Pas de classement individuel vérifié pour cette étape.</EmptyState>
      ) : (
        <ol className="finishers">
          {s.topFinishers.map((f) => (
            <li key={f.position} value={f.position}>
              <Rank value={f.position} />
              {riderName(f.riderId)}
            </li>
          ))}
        </ol>
      )}
      <p className="note">Seules les positions vérifiées dans les sources sont listées.</p>

      {s.notes && (
        <>
          <h2>Résumé</h2>
          <p>{s.notes}</p>
        </>
      )}
    </article>
  )
}
