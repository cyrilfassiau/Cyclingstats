import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Filtres stockés dans l'URL : l'état est dérivé de la query string, ce qui rend
 * chaque vue partageable. Les mises à jour remplacent l'entrée d'historique.
 */
export function useUrlFilters<T>(
  parse: (params: URLSearchParams) => T,
  serialize: (filters: T) => URLSearchParams,
) {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parse(params), [params, parse])

  const update = useCallback(
    (patch: Partial<T>) => {
      setParams((prev) => serialize({ ...parse(prev), ...patch }), { replace: true })
    },
    [setParams, parse, serialize],
  )

  return [filters, update] as const
}
