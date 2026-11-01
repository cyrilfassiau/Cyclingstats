import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/QueryState'
import { Rank } from '@/components/Rank'
import { RiderName } from '@/components/RiderName'
import { formatDuration } from '@/lib/format'
import { CompareButton, FavoriteButton } from '@/features/riders/RiderActions'
import { compareByGc } from '@/features/riders/stats'
import { useRiderStats } from '@/features/riders/useRiderStats'
import { usePreferences } from '@/store/preferences'

export default function FavoritesPage() {
  const favorites = usePreferences((s) => s.favorites)
  const stats = useRiderStats()

  if (favorites.length === 0) {
    return (
      <section aria-labelledby="favorites-title">
        <h1 id="favorites-title">Favoris</h1>
        <EmptyState>
          Aucun favori pour l'instant. Ajoutez-en avec l'étoile depuis la page{' '}
          <Link to="/riders">Coureurs</Link>.
        </EmptyState>
      </section>
    )
  }
  if (stats.isPending) return <p aria-busy="true">Chargement des favoris…</p>
  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.retry} />

  const rows = favorites.flatMap((id) => {
    const s = stats.data?.get(id)
    return s ? [s] : []
  })
  rows.sort(compareByGc)

  return (
    <section aria-labelledby="favorites-title">
      <h1 id="favorites-title">Favoris</h1>
      <p className="note">Enregistrés dans ce navigateur.</p>
      <div className="table-wrap">
        <table>
          <caption className="panel-title">Coureurs favoris</caption>
          <thead>
            <tr>
              <th scope="col">Coureur</th>
              <th scope="col" className="num">
                Classement
              </th>
              <th scope="col" className="num">
                Victoires
              </th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.rider.id}>
                <td>
                  <RiderName name={s.rider.name} team={s.teamName} to={`/dashboard?rider=${s.rider.id}`} />
                </td>
                <td className="num">
                  {s.gcRank ? (
                    <span className="rank-cell">
                      {s.gapSeconds ? <span className="meta">+ {formatDuration(s.gapSeconds)}</span> : null}
                      <Rank value={s.gcRank} />
                    </span>
                  ) : (
                    <span className="meta">Abandon</span>
                  )}
                </td>
                <td className="num">{s.stageWins}</td>
                <td className="actions">
                  <FavoriteButton riderId={s.rider.id} riderName={s.rider.name} />
                  <CompareButton riderId={s.rider.id} riderName={s.rider.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
