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
        {demoCount > 1 ? "de mes sorties réelles" : "de mes sortie réelle de l'auteur"}. Importez vos fichiers pour les remplacer, sachant que tout reste en local.
      </p>
      <button type="button" onClick={dismissDemo}>
        Retirer la démo
      </button>
    </div>
  )
}
