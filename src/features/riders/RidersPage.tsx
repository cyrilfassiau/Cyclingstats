import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RIDERS_PAGE_SIZE, useRidersById, useRidersPage, useTeamsById } from '@/api/riders'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/QueryState'
import { useDebouncedUrlSearch } from '@/hooks/useDebouncedUrlSearch'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { parseRiderFilters, serializeRiderFilters } from './filters'
import { CompareButton, FavoriteButton } from './RiderActions'

export default function RidersPage() {
  const [filters, setFilters] = useUrlFilters(parseRiderFilters, serializeRiderFilters)
  const pushSearch = useCallback((q: string) => setFilters({ q, page: 1 }), [setFilters])
  const [search, setSearch] = useDebouncedUrlSearch(filters.q, pushSearch)

  // Chaque changement de filtre déclenche une requête paginée ; la précédente est annulée.
  const page = useRidersPage(filters)
  const teams = useTeamsById()
  const allRiders = useRidersById()

  const teamOptions = useMemo(
    () => [...(teams.data?.values() ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [teams.data],
  )
  const nationalities = useMemo(
    () => [...new Set([...(allRiders.data?.values() ?? [])].map((r) => r.nationality))].sort(),
    [allRiders.data],
  )

  return (
    <section aria-labelledby="riders-title">
      <h1 id="riders-title">Coureurs</h1>

      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          Recherche
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, équipe, pays…"
          />
        </label>
        <label>
          Équipe
          <select
            value={filters.team ?? ''}
            onChange={(e) => setFilters({ team: e.target.value || undefined, page: 1 })}
          >
            <option value="">Toutes</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nationalité
          <select
            value={filters.nationality ?? ''}
            onChange={(e) => setFilters({ nationality: e.target.value || undefined, page: 1 })}
          >
            <option value="">Toutes</option>
            {nationalities.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </form>

      {page.isPending ? (
        <TableSkeleton rows={10} columns={5} />
      ) : page.isError ? (
        <ErrorState error={page.error} onRetry={() => page.refetch()} />
      ) : page.data.items.length === 0 ? (
        <EmptyState>Aucun coureur ne correspond à cette recherche.</EmptyState>
      ) : (
        <>
          <p className="note" aria-live="polite">
            {page.data.total} coureur{page.data.total > 1 ? 's' : ''}
          </p>
          <div className="table-wrap" aria-busy={page.isFetching}>
            <table>
              <caption className="visually-hidden">Coureurs du Tour de France 2026</caption>
              <thead>
                <tr>
                  <th scope="col">Coureur</th>
                  <th scope="col">Nat.</th>
                  <th scope="col">Équipe</th>
                  <th scope="col" className="num">
                    Classement final
                  </th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.data.items.map((rider) => (
                  <tr key={rider.id}>
                    <td>
                      <Link to={`/dashboard?rider=${rider.id}`}>{rider.name}</Link>
                    </td>
                    <td>{rider.nationality}</td>
                    <td>{teams.data?.get(rider.teamId)?.name ?? rider.teamId}</td>
                    <td className="num">
                      {rider.finalRank ??
                        `Abandon${rider.abandonedOnStage ? ` (ét. ${rider.abandonedOnStage})` : ''}`}
                    </td>
                    <td className="actions">
                      <FavoriteButton riderId={rider.id} riderName={rider.name} />
                      <CompareButton riderId={rider.id} riderName={rider.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={filters.page}
            pageCount={Math.max(1, Math.ceil(page.data.total / RIDERS_PAGE_SIZE))}
            onChange={(p) => setFilters({ page: p })}
          />
        </>
      )}
    </section>
  )
}
