import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '@/test/render'
import { useRides } from '@/store/rides'
import RidesPage from './RidesPage'
import { formatDecimal } from '@/lib/format'
import { parseGpx } from './gpx'
import { computeRide, type Ride } from './rideStats'

const GPX = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Boucle du matin</name><trkseg>
    <trkpt lat="45.00" lon="6.0"><ele>400</ele><time>2026-09-12T08:00:00Z</time></trkpt>
    <trkpt lat="45.01" lon="6.0"><ele>410</ele><time>2026-09-12T08:02:00Z</time></trkpt>
    <trkpt lat="45.02" lon="6.0"><ele>430</ele><time>2026-09-12T08:04:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`

beforeEach(() => useRides.setState({ rides: [] }))

describe('page Mes sorties', () => {
  it('importe un GPX valide et signale un fichier invalide', async () => {
    const user = userEvent.setup()
    renderPage(<RidesPage />, { url: '/rides' })
    expect(await screen.findByText("Aucune sortie pour l'instant.")).toBeInTheDocument()

    await user.upload(screen.getByLabelText(/Déposer des fichiers GPX/), [
      new File([GPX], 'matin.gpx', { type: 'application/gpx+xml' }),
      new File(['pas un gpx'], 'cassé.gpx', { type: 'application/gpx+xml' }),
    ])

    expect(await screen.findByText('matin.gpx : « Boucle du matin » ajoutée.')).toBeInTheDocument()
    expect(screen.getByText("cassé.gpx : Ce fichier n'est pas un XML valide.")).toBeInTheDocument()

    const table = screen.getByRole('table', { name: '1 sortie' })
    expect(within(table).getByRole('link', { name: 'Boucle du matin' })).toBeInTheDocument()
    expect(within(table).getByText('2,2 km')).toBeInTheDocument()
    expect(useRides.getState().rides).toHaveLength(1)
  })

  it('refuse d’importer deux fois la même sortie', async () => {
    const user = userEvent.setup()
    renderPage(<RidesPage />, { url: '/rides' })
    const input = screen.getByLabelText(/Déposer des fichiers GPX/)

    await user.upload(input, new File([GPX], 'matin.gpx'))
    await screen.findByText('matin.gpx : « Boucle du matin » ajoutée.')
    await user.upload(input, new File([GPX], 'matin.gpx'))

    expect(await screen.findByText('matin.gpx : déjà importé.')).toBeInTheDocument()
    expect(useRides.getState().rides).toHaveLength(1)
  })
})

describe('page Mes sorties : graphique et récap', () => {
  // 30 sorties : plus que les 25 lignes d'une page du tableau, sur deux années, dont une non datée.
  const base = computeRide(parseGpx(GPX).points, { id: 'x', name: 'Sortie', fileName: 'x.gpx' })
  const rides: Ride[] = Array.from({ length: 30 }, (_, i) => ({
    ...base,
    id: `r${i}`,
    fileName: `r${i}.gpx`,
    startTime:
      i === 0 ? null : Date.parse(i < 10 ? '2025-06-15T08:00:00Z' : '2026-09-15T08:00:00Z'),
  }))

  beforeEach(() => useRides.setState({ rides }))

  it('compte absolument toutes les sorties dans le récap face au Tour', async () => {
    renderPage(<RidesPage />, { url: '/rides' })

    const recap = await screen.findByRole('columnheader', { name: 'Mes 30 sorties' })
    const table = recap.closest('table')!
    const distanceRow = within(table).getByRole('row', { name: /^Distance/ })
    expect(distanceRow).toHaveTextContent(`${formatDecimal(base.distanceKm * 30)} km`)
  })

  it('bascule les kilomètres entre mois et années, dans l’URL', async () => {
    const user = userEvent.setup()
    renderPage(<RidesPage />, { url: '/rides' })

    expect(await screen.findByRole('heading', { name: 'Kilomètres par mois' })).toBeInTheDocument()
    expect(screen.getByText(/1 sortie non datée/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Par an' }))

    expect(screen.getByRole('heading', { name: 'Kilomètres par an' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Par an' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('location')).toHaveTextContent('/rides?periode=an')
    const dataTable = screen.getAllByRole('table').find((t) => within(t).queryByText('Année'))!
    expect(within(dataTable).getByRole('row', { name: /^2025 9/ })).toBeInTheDocument()
    expect(within(dataTable).getByRole('row', { name: /^2026 20/ })).toBeInTheDocument()
  })
})
