import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ApiError } from './api/client'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Une erreur 4xx (ressource absente…) ne se corrigera pas en réessayant.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 3,
    },
  },
})

async function enableMocking() {
  const { worker } = await import('./mocks/browser')
  // Laisse passer sans avertissement ce que la fausse API ne gère pas (Open-Meteo, tuiles OSM…).
  await worker.start({ onUnhandledFrame: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )
})
