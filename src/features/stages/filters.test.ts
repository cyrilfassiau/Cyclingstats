import { parseStageFilters, serializeStageFilters } from './filters'

describe('filtres des étapes', () => {
  it('applique les valeurs par défaut sur une URL vide', () => {
    expect(parseStageFilters(new URLSearchParams())).toEqual({
      type: undefined,
      sort: 'number',
      order: 'asc',
    })
  })

  it('ignore les valeurs inconnues', () => {
    const filters = parseStageFilters(new URLSearchParams('type=cobbles&sort=foo&order=up'))
    expect(filters).toEqual({ type: undefined, sort: 'number', order: 'asc' })
  })

  it('omet les valeurs par défaut dans l’URL', () => {
    const params = serializeStageFilters({ type: 'mountain', sort: 'number', order: 'desc' })
    expect(params.toString()).toBe('type=mountain&order=desc')
  })
})
