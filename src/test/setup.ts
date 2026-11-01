import '@testing-library/jest-dom/vitest'
import { server } from './server'

// Le fetch de Node refuse les URL relatives (« /api/stages ») : on les résout comme le ferait
// le navigateur, par rapport à l'origine de la page jsdom.
const nativeFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
  nativeFetch(
    typeof input === 'string' && input.startsWith('/')
      ? new URL(input, window.location.origin)
      : input,
    init,
  )

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
})
afterAll(() => server.close())

// jsdom n'implémente pas ResizeObserver, dont ResponsiveContainer (Recharts) a besoin.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
