import { useRides } from '@/store/rides'

/** Signale que les sorties affichées sont celles de la démo, et comment les remplacer. */
export function DemoBanner() {
  const demoCount = useRides((s) => s.rides.filter((r) => r.demo).length)
  const dismissDemo = useRides((s) => s.dismissDemo)
  if (demoCount === 0) return null

  return (
    <div className="demo-banner" role="note">
      <p>
        <strong>Démonstration :</strong> {demoCount}{' '}
        {demoCount > 1 ? "sorties réelles de l'auteur" : "sortie réelle de l'auteur"}, départs et
        arrivées masqués. Importez vos fichiers pour les remplacer : tout reste dans votre
        navigateur.
      </p>
      <button type="button" onClick={dismissDemo}>
        Retirer la démo
      </button>
    </div>
  )
}
