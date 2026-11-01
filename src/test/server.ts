import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers'

/** Les mêmes handlers que dans le navigateur, servis dans Node pour les tests. */
export const server = setupServer(...handlers)
