import { http, HttpResponse } from 'msw'
import type { Paginated, Stage } from '@/api/types'
import stages2024 from './data/stages-2024.json'

const PAGE_SIZE = 10

// Jeu de données provisoire: sera remplacé par le JSON complet généré par data-prep/.
export const handlers = [
  http.get('/api/stages', ({ request }) => {
    const url = new URL(request.url)
    const edition = Number(url.searchParams.get('edition') ?? 2024)
    const page = Number(url.searchParams.get('page') ?? 1)
    const all = (stages2024 as Stage[]).filter((s) => s.edition === edition)
    const body: Paginated<Stage> = {
      items: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      total: all.length,
    }
    return HttpResponse.json(body)
  }),
]
