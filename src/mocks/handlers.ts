import { delay, http, HttpResponse } from 'msw'
import db from './data/db.json'

// Imite le sous-ensemble de json-server 0.17 dont le front a besoin :
// filtres par égalité, q (plein texte), _sort/_order, _page/_limit avec X-Total-Count.
type Row = Record<string, unknown>
type Collection = Exclude<keyof typeof db, 'meta'>

const RESERVED = new Set(['q', '_sort', '_order', '_page', '_limit'])

function queryRows(rows: Row[], params: URLSearchParams) {
  let result = rows

  for (const [key, value] of params) {
    if (RESERVED.has(key)) continue
    result = result.filter((row) => String(row[key]) === value)
  }

  const q = params.get('q')?.toLowerCase()
  if (q) result = result.filter((row) => JSON.stringify(row).toLowerCase().includes(q))

  const sort = params.get('_sort')
  if (sort) {
    const direction = params.get('_order') === 'desc' ? -1 : 1
    result = [...result].sort((a, b) => {
      const x = a[sort] as string | number
      const y = b[sort] as string | number
      return x < y ? -direction : x > y ? direction : 0
    })
  }

  const total = result.length
  const page = Number(params.get('_page'))
  const limit = Number(params.get('_limit')) || (page ? 10 : 0)
  if (limit) {
    const start = page ? (page - 1) * limit : 0
    result = result.slice(start, start + limit)
  }

  return { rows: result, total }
}

function isCollection(name: string): name is Collection {
  return name !== 'meta' && Array.isArray((db as Record<string, unknown>)[name])
}

export const handlers = [
  http.get('/api/meta', async () => {
    await delay()
    return HttpResponse.json(db.meta)
  }),

  http.get('/api/:collection', async ({ request, params }) => {
    const name = String(params.collection)
    if (!isCollection(name)) return new HttpResponse(null, { status: 404 })
    await delay()
    const { rows, total } = queryRows(db[name] as Row[], new URL(request.url).searchParams)
    return HttpResponse.json(rows, { headers: { 'X-Total-Count': String(total) } })
  }),

  http.get('/api/:collection/:id', async ({ params }) => {
    const name = String(params.collection)
    if (!isCollection(name)) return new HttpResponse(null, { status: 404 })
    await delay()
    const row = (db[name] as Row[]).find((r) => String(r.id) === params.id)
    return row ? HttpResponse.json(row) : new HttpResponse(null, { status: 404 })
  }),
]
