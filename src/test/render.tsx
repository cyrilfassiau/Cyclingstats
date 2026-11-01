import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

/** Affiche l'URL courante, pour vérifier que les filtres y sont bien écrits. */
function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

/**
 * Rend une page comme dans l'appli : routeur en mémoire (URL de départ au choix) et
 * QueryClient neuf à chaque test, sans re-essai pour que les erreurs s'affichent tout de suite.
 */
export function renderPage(element: ReactElement, { url = '/', path = '*' } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path={path} element={element} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
