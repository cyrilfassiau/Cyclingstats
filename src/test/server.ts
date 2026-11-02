import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers'

/**
 * Les mêmes handlers que dans le navigateur, servis dans Node pour les tests. Le fichier de
 * démo (servi par Vite dans l'appli) est absent par défaut ; un test peut le fournir.
 */
export const server = setupServer(
  ...handlers,
  http.get('/demo/rides.json', () => new HttpResponse(null, { status: 404 })),
)
