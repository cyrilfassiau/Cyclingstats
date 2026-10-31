import { filterGcRows, parseGcFilters, serializeGcFilters, type GcRow } from './filters'

const rows: GcRow[] = [
  { rank: 1, riderId: 'p', name: 'Tadej Pogačar', nationality: 'SLO', teamId: 'uae', teamName: 'UAE', time: '73:56:26' },
  { rank: 2, riderId: 'v', name: 'Jonas Vingegaard', nationality: 'DEN', teamId: 'visma', teamName: 'Visma', time: '', gap: '2:30' },
  { rank: 3, riderId: 'a', name: 'Kévin Vauquelin', nationality: 'FRA', teamId: 'ineos', teamName: 'INEOS', time: '', gap: '5:10' },
]

const defaults = parseGcFilters(new URLSearchParams())

describe('filtres du classement général', () => {
  it('lit et réécrit l’URL sans les valeurs par défaut', () => {
    const filters = parseGcFilters(new URLSearchParams('team=uae&page=3&sort=name'))
    expect(filters).toMatchObject({ team: 'uae', page: 3, sort: 'name', order: 'asc', q: '' })
    expect(serializeGcFilters(filters).toString()).toBe('team=uae&sort=name&page=3')
  })

  it('remplace une page invalide par 1', () => {
    expect(parseGcFilters(new URLSearchParams('page=-2')).page).toBe(1)
  })

  it('cherche sans tenir compte des accents ni de la casse', () => {
    const result = filterGcRows(rows, { ...defaults, q: 'POGACAR' })
    expect(result.map((r) => r.riderId)).toEqual(['p'])
  })

  it('combine équipe et nationalité', () => {
    expect(filterGcRows(rows, { ...defaults, team: 'visma', nationality: 'DEN' })).toHaveLength(1)
    expect(filterGcRows(rows, { ...defaults, team: 'visma', nationality: 'FRA' })).toHaveLength(0)
  })

  it('trie par nom en ordre décroissant', () => {
    const result = filterGcRows(rows, { ...defaults, sort: 'name', order: 'desc' })
    expect(result.map((r) => r.riderId)).toEqual(['p', 'a', 'v'])
  })
})
