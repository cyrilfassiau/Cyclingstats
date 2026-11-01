import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { expectNoAxeViolations } from '@/test/axe'
import { renderPage } from '@/test/render'
import { server } from '@/test/server'
import StagesPage from './StagesPage'

const rows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

describe('page Étapes', () => {
  it('applique les filtres présents dans l’URL', async () => {
    renderPage(<StagesPage />, { url: '/stages?type=mountain' })
    expect(await screen.findByText('8 étapes')).toBeInTheDocument()
    expect(rows()).toHaveLength(8)
    expect(screen.getByLabelText('Type')).toHaveValue('mountain')
  })

  it('écrit le filtre choisi dans l’URL et recharge la liste', async () => {
    const user = userEvent.setup()
    renderPage(<StagesPage />, { url: '/stages' })
    expect(await screen.findByText('21 étapes')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Type'), 'flat')

    expect(screen.getByTestId('location')).toHaveTextContent('/stages?type=flat')
    await waitFor(() => expect(rows().length).toBeLessThan(21))
    for (const row of rows()) expect(row).toHaveTextContent('Plat')
  })

  it('affiche une erreur avec « Réessayer », puis se rétablit', async () => {
    server.use(http.get('/api/stages', () => new HttpResponse(null, { status: 500 })))
    const user = userEvent.setup()
    renderPage(<StagesPage />, { url: '/stages' })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('500')

    server.resetHandlers()
    await user.click(within(alert).getByRole('button', { name: 'Réessayer' }))
    expect(await screen.findByText('21 étapes')).toBeInTheDocument()
  })

  it('ne présente pas de problème d’accessibilité détectable', async () => {
    const { container } = renderPage(<StagesPage />, { url: '/stages' })
    await screen.findByText('21 étapes')
    await expectNoAxeViolations(container)
  })
})
