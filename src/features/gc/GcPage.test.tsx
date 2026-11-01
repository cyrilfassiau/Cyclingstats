import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expectNoAxeViolations } from '@/test/axe'
import { renderPage } from '@/test/render'
import GcPage from './GcPage'

describe('page Classement général', () => {
  it('recherche un coureur avec debounce, sans tenir compte des accents', async () => {
    const user = userEvent.setup()
    renderPage(<GcPage />, { url: '/gc' })
    expect(await screen.findByText('158 coureurs sur 158')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox'), 'pogacar')

    // L'URL n'est écrite qu'après la pause de frappe.
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/gc$/)
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/gc?q=pogacar'))
    expect(screen.getByText('1 coureur sur 158')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('Pogačar')).toBeInTheDocument()
  })

  it('combine équipe et nationalité depuis l’URL', async () => {
    renderPage(<GcPage />, { url: '/gc?team=uae-team-emirates-xrg&nationality=SLO' })
    expect(await screen.findByText(/^\d+ coureurs? sur 158$/)).toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    for (const row of rows) {
      expect(row).toHaveTextContent('UAE Team Emirates XRG')
      expect(row).toHaveTextContent('SLO')
    }
  })

  it('ne présente pas de problème d’accessibilité détectable', async () => {
    const { container } = renderPage(<GcPage />, { url: '/gc' })
    await screen.findByText('158 coureurs sur 158')
    await expectNoAxeViolations(container)
  })
})
