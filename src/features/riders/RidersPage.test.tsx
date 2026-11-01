import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '@/test/render'
import { usePreferences } from '@/store/preferences'
import RidersPage from './RidersPage'

beforeEach(() => usePreferences.setState({ favorites: [], compared: [] }))

describe('page Coureurs', () => {
  it('pagine côté API avec le total renvoyé par X-Total-Count', async () => {
    const user = userEvent.setup()
    renderPage(<RidersPage />, { url: '/riders?nationality=FRA&page=2' })

    expect(await screen.findByText('29 coureurs')).toBeInTheDocument()
    expect(screen.getByText('Page 2 sur 2')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(1 + 9)

    await user.click(screen.getByRole('button', { name: 'Précédent' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/riders?nationality=FRA')
    expect(await screen.findByText('Page 1 sur 2')).toBeInTheDocument()
  })

  it('ajoute un coureur aux favoris et au comparateur', async () => {
    const user = userEvent.setup()
    renderPage(<RidersPage />, { url: '/riders?q=pogacar' })

    const favorite = await screen.findByRole('button', {
      name: /Ajouter Tadej Pogačar aux favoris/,
    })
    await user.click(favorite)
    expect(favorite).toHaveAttribute('aria-pressed', 'true')
    expect(usePreferences.getState().favorites).toEqual(['tadej-pogacar'])

    const compare = screen.getByRole('button', { name: 'Comparer Tadej Pogačar' })
    await user.click(compare)
    expect(compare).toHaveAttribute('aria-pressed', 'true')
    expect(usePreferences.getState().compared).toEqual([{ id: 'tadej-pogacar', slot: 0 }])
  })
})
