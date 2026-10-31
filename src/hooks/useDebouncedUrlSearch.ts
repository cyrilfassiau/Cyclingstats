import { useEffect, useRef, useState } from 'react'
import { useDebouncedValue } from './useDebouncedValue'

/**
 * Champ de recherche local dont la valeur n'est poussée dans l'URL qu'après une pause
 * de frappe : une seule requête (ou un seul filtrage) par saisie.
 */
export function useDebouncedUrlSearch(urlValue: string, push: (value: string) => void) {
  const [search, setSearch] = useState(urlValue)
  const debounced = useDebouncedValue(search)
  const lastPushed = useRef(urlValue)

  useEffect(() => {
    if (debounced === lastPushed.current) return
    lastPushed.current = debounced
    push(debounced)
  }, [debounced, push])

  return [search, setSearch] as const
}
