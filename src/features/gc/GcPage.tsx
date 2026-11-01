import { useCallback, useMemo } from 'react'
import { useGc } from '@/api/gc'
import { useRidersById, useTeamsById } from '@/api/riders'
import { Pagination } from '@/components/Pagination'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/QueryState'
import { Rank } from '@/components/Rank'
import { RiderName } from '@/components/RiderName'
import { useDebouncedUrlSearch } from '@/hooks/useDebouncedUrlSearch'
import { useUrlFilters } from '@/hooks/useUrlFilters'
import { oneOf } from '@/lib/params'
import { filterGcRows, GC_SORTS, parseGcFilters, serializeGcFilters, type GcRow } from './filters'

const PAGE_SIZE = 20

export default function GcPage() {
  const [filters, setFilters] = useUrlFilters(parseGcFilters, serializeGcFilters)
  // Trois requêtes lancées en parallèle, jointes côté front.
  const gc = useGc()
  const riders = useRidersById()
  const teams = useTeamsById()

  // La saisie est locale ; l'URL n'est mise à jour qu'après 300 ms sans frappe.
  const pushSearch = useCallback((q: string) => setFilters({ q, page: 1 }), [setFilters])
  const [search, setSearch] = useDebouncedUrlSearch(filters.q, pushSearch)

  const rows = useMemo<GcRow[]>(() => {
    if (!gc.data || !riders.data || !teams.data) return []
    return gc.data.items.map((entry) => {
      const rider = riders.data.get(entry.riderId)
      return {
        rank: entry.rank,
        riderId: entry.riderId,
        name: rider?.name ?? entry.riderId,
        nationality: rider?.nationality ?? '',
        teamId: entry.teamId,
        teamName: teams.data.get(entry.teamId)?.name ?? entry.teamId,
        time: entry.time,
        gap: entry.gap,
      }
    })
  }, [gc.data, riders.data, teams.data])

  const nationalities = useMemo(
    () => [...new Set(rows.map((row) => row.nationality))].sort(),
    [rows],
  )
  const teamOptions = useMemo(
    () => [...(teams.data?.values() ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [teams.data],
  )

  const filtered = useMemo(() => filterGcRows(rows, filters), [rows, filters])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(filters.page, pageCount)
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const error = gc.error ?? riders.error ?? teams.error
  const isPending = gc.isPending || riders.isPending || teams.isPending
  const retry = () => {
    if (gc.isError) gc.refetch()
    if (riders.isError) riders.refetch()
    if (teams.isError) teams.refetch()
  }

  return (
    <section aria-labelledby="gc-title">
      <h1 id="gc-title">Classement général final</h1>

      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          Coureur
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom du coureur"
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
        <label>
          Trier par
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ sort: oneOf(e.target.value, GC_SORTS), page: 1 })}
          >
            <option value="rank">Rang</option>
            <option value="name">Nom</option>
          </select>
        </label>
        <label>
          Ordre
          <select
            value={filters.order}
            onChange={(e) =>
              setFilters({ order: e.target.value === 'desc' ? 'desc' : 'asc', page: 1 })
            }
          >
            <option value="asc">Croissant</option>
            <option value="desc">Décroissant</option>
          </select>
        </label>
      </form>

      {isPending ? (
        <TableSkeleton rows={10} columns={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={retry} />
      ) : filtered.length === 0 ? (
        <EmptyState>Aucun coureur ne correspond à ces filtres.</EmptyState>
      ) : (
        <>
          <p className="note" aria-live="polite">
            {filtered.length} coureur{filtered.length > 1 ? 's' : ''} sur {rows.length}
          </p>
          <div className="table-wrap">
            <table>
              <caption className="panel-title">Classement général final</caption>
              <thead>
                <tr>
                  <th scope="col" className="num">
                    Rang
                  </th>
                  <th scope="col">Coureur</th>
                  <th scope="col">Nat.</th>
                  <th scope="col" className="num">
                    Temps / écart
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.riderId}>
                    <td className="num">
                      <Rank value={row.rank} />
                    </td>
                    <td>
                      <RiderName name={row.name} team={row.teamName} to={`/dashboard?rider=${row.riderId}`} />
                    </td>
                    <td className="meta">{row.nationality}</td>
                    <td className="num">{row.gap ? `+ ${row.gap}` : row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageCount={pageCount} onChange={(p) => setFilters({ page: p })} />
        </>
      )}
    </section>
  )
}
