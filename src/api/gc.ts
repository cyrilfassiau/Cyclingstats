import { useQuery } from '@tanstack/react-query'
import { gcQuery } from './queries'

export function useGc() {
  return useQuery(gcQuery)
}
