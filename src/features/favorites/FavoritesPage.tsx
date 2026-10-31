import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/QueryState'
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
          Aucun favori pour l'instant. Ajoutez-en avec ☆ depuis la page{' '}
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
          <caption className="visually-hidden">Coureurs favoris</caption>
          <thead>
            <tr>
              <th scope="col">Coureur</th>
              <th scope="col">Équipe</th>
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
                  <Link to={`/dashboard?rider=${s.rider.id}`}>{s.rider.name}</Link>
                </td>
                <td>{s.teamName}</td>
                <td className="num">
                  {s.gcRank
                    ? `${s.gcRank}e${s.gapSeconds ? ` (+ ${formatDuration(s.gapSeconds)})` : ''}`
                    : 'Abandon'}
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
