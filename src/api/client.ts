import type { ListResult } from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export type QueryParams = Record<string, string | number | undefined>

function buildUrl(path: string, params?: QueryParams) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return `/api${path}${query ? `?${query}` : ''}`
}

async function request(path: string, params?: QueryParams, signal?: AbortSignal) {
  const response = await fetch(buildUrl(path, params), { signal })
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} a échoué (${response.status})`)
  }
  return response
}

export async function apiGet<T>(
  path: string,
  params?: QueryParams,
  signal?: AbortSignal,
): Promise<T> {
  const response = await request(path, params, signal)
  return (await response.json()) as T
}

export async function apiGetList<T>(
  path: string,
  params?: QueryParams,
  signal?: AbortSignal,
): Promise<ListResult<T>> {
  const response = await request(path, params, signal)
  const items = (await response.json()) as T[]
  const total = Number(response.headers.get('X-Total-Count') ?? items.length)
  return { items, total }
}
