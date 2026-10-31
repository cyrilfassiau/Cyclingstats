import { useStages } from '@/api/stages'

export default function StagesPage() {
  const { data, isPending, error, refetch } = useStages(2024, 1)

  if (isPending) return <p>Chargement…</p>
  if (error) {
    return (
      <div role="alert">
        <p>{error.message}</p>
        <button onClick={() => refetch()}>Réessayer</button>
      </div>
    )
  }
  if (data.items.length === 0) return <p>Aucune étape.</p>

  return (
    <ul>
      {data.items.map((s) => (
        <li key={s.id}>
          Étape {s.number} : {s.departure} → {s.arrival} ({s.distanceKm} km)
        </li>
      ))}
    </ul>
  )
}
