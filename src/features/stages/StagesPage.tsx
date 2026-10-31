import { Link } from 'react-router-dom'
import { useRidersById, useTeamsById } from '@/api/riders'
import { useStages } from '@/api/stages'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/QueryState'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { formatDate, formatKm } from '@/lib/format'
import { oneOf } from '@/lib/params'
import { parseStageFilters, serializeStageFilters, STAGE_SORTS } from './filters'
import { STAGE_TYPE_LABELS, STAGE_TYPES } from './labels'

const SORT_LABELS = { number: 'Numéro', distanceKm: 'Distance' } as const

export default function StagesPage() {
  const [filters, setFilters] = useUrlFilters(parseStageFilters, serializeStageFilters)
  const stages = useStages(filters)
  const riders = useRidersById()
  const teams = useTeamsById()

  return (
    <section aria-labelledby="stages-title">
      <h1 id="stages-title">Étapes</h1>

      <form className="filters" onSubmit={(e) => e.preventDefault()}>
        <label>
          Type
          <select
            value={filters.type ?? ''}
            onChange={(e) => setFilters({ type: oneOf(e.target.value, STAGE_TYPES) })}
          >
            <option value="">Tous</option>
            {STAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {STAGE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trier par
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ sort: oneOf(e.target.value, STAGE_SORTS) })}
          >
            {STAGE_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ordre
          <select
            value={filters.order}
            onChange={(e) => setFilters({ order: e.target.value === 'desc' ? 'desc' : 'asc' })}
          >
            <option value="asc">Croissant</option>
            <option value="desc">Décroissant</option>
          </select>
        </label>
      </form>

      {stages.isPending ? (
        <TableSkeleton columns={6} />
      ) : stages.isError ? (
        <ErrorState error={stages.error} onRetry={() => stages.refetch()} />
      ) : stages.data.items.length === 0 ? (
        <EmptyState>Aucune étape ne correspond à ces filtres.</EmptyState>
      ) : (
        <div className="table-wrap" aria-busy={stages.isFetching}>
          <table>
            <caption className="visually-hidden">
              {stages.data.total} étapes du Tour de France 2026
            </caption>
            <thead>
              <tr>
                <th scope="col">N°</th>
                <th scope="col">Date</th>
                <th scope="col">Parcours</th>
                <th scope="col" className="num">
                  Distance
                </th>
                <th scope="col">Type</th>
                <th scope="col">Vainqueur</th>
                <th scope="col">Maillot jaune</th>
              </tr>
            </thead>
            <tbody>
              {stages.data.items.map((stage) => (
                <tr key={stage.id}>
                  <td>{stage.number}</td>
                  <td>{formatDate(stage.date)}</td>
                  <td>
                    <Link to={`/stages/${stage.id}`}>
                      {stage.start} → {stage.finish}
                    </Link>
                  </td>
                  <td className="num">{formatKm(stage.distanceKm)}</td>
                  <td>
                    <span className={`badge badge-${stage.type}`}>
                      {STAGE_TYPE_LABELS[stage.type]}
                    </span>
                  </td>
                  <td>
                    {stage.winnerRiderId
                      ? (riders.data?.get(stage.winnerRiderId)?.name ?? '…')
                      : stage.winnerTeamId
                        ? (teams.data?.get(stage.winnerTeamId)?.name ?? '…')
                        : '—'}
                  </td>
                  <td>{riders.data?.get(stage.yellowJerseyRiderId)?.name ?? '…'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
