import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useRides, useRidesHydrated } from '@/store/rides'
import { DEMO_URL, isDemoFile } from './demo'

async function fetchDemo(signal: AbortSignal) {
  const response = await fetch(DEMO_URL, { signal })
  if (!response.ok) return null
  try {
    const file: unknown = await response.json()
    // Un hébergeur peut renvoyer la page HTML de l'appli pour un fichier absent.
    return isDemoFile(file) ? file : null
  } catch {
    return null
  }
}

/**
 * Charge les sorties de démonstration publiées avec le site chez un visiteur qui n'a pas
 * encore importé les siennes, ou met à jour une ancienne démo. Absence de fichier : rien.
 */
export function useDemoRides() {
  const hydrated = useRidesHydrated()
  const demoDismissed = useRides((s) => s.demoDismissed)
  const hasOwnRides = useRides((s) => s.rides.some((r) => !r.demo))
  const enabled = hydrated && !demoDismissed && !hasOwnRides

  const demo = useQuery({
    queryKey: ['demo-rides'],
    queryFn: ({ signal }) => fetchDemo(signal),
    enabled,
    staleTime: Infinity,
    retry: false,
  })

  useEffect(() => {
    const file = demo.data
    if (!enabled || !file || file.rides.length === 0) return
    const { demoVersion, rides, loadDemo } = useRides.getState()
    if (demoVersion === file.version && rides.length > 0) return
    loadDemo(file.rides, file.version)
  }, [demo.data, enabled])
}
