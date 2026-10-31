import { MAX_COMPARED, usePreferences } from './preferences'

beforeEach(() => {
  usePreferences.setState({ favorites: [], compared: [], theme: 'system' })
})

describe('préférences', () => {
  it('ajoute puis retire un favori', () => {
    const { toggleFavorite } = usePreferences.getState()
    toggleFavorite('tadej-pogacar')
    expect(usePreferences.getState().favorites).toEqual(['tadej-pogacar'])
    toggleFavorite('tadej-pogacar')
    expect(usePreferences.getState().favorites).toEqual([])
  })

  it(`limite le comparateur à ${MAX_COMPARED} coureurs`, () => {
    const { toggleCompared } = usePreferences.getState()
    for (const id of ['a', 'b', 'c', 'd', 'e']) toggleCompared(id)
    expect(usePreferences.getState().compared.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('réutilise le slot libéré sans recolorer les autres coureurs', () => {
    const { toggleCompared } = usePreferences.getState()
    for (const id of ['a', 'b', 'c']) toggleCompared(id)
    toggleCompared('a')
    toggleCompared('d')
    expect(usePreferences.getState().compared).toEqual([
      { id: 'b', slot: 1 },
      { id: 'c', slot: 2 },
      { id: 'd', slot: 0 },
    ])
  })
})
