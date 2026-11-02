import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '@/test/render'
import { useRides } from '@/store/rides'
import RidesPage from './RidesPage'
import { formatDecimal } from '@/lib/format'
import { parseGpx } from './gpx'
import { computeRide, type Ride } from './rideStats'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/server'
import { buildDemoFile } from './demo'

const GPX = `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <trk><name>Boucle du matin</name><trkseg>
    <trkpt lat="45.00" lon="6.0"><ele>400</ele><time>2026-09-12T08:00:00Z</time></trkpt>
    <trkpt lat="45.01" lon="6.0"><ele>410</ele><time>2026-09-12T08:02:00Z</time></trkpt>
    <trkpt lat="45.02" lon="6.0"><ele>430</ele><time>2026-09-12T08:04:00Z</time></trkpt>
  </trkseg></trk>
</gpx>`

beforeEach(() => useRides.setState({ rides: [], demoVersion: null, demoDismissed: false }))

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

describe('page Mes sorties : démo', () => {
  // Trace d'environ 3 km en ligne droite : il en reste une fois le départ et l'arrivée masqués.
  const longGpx = GPX.replace(
    /<trkseg>[\s\S]*<\/trkseg>/,
    `<trkseg>${Array.from(
      { length: 30 },
      (_, i) =>
        `<trkpt lat="${(45 + i * 0.001).toFixed(3)}" lon="6.0"><ele>400</ele><time>2026-09-12T08:${String(i).padStart(2, '0')}:00Z</time></trkpt>`,
    ).join('')}</trkseg>`,
  )
  const demoRide = computeRide(parseGpx(longGpx).points, {
    id: 'demo-1',
    name: 'Col de la démo',
    fileName: 'demo.fit',
  })

  beforeEach(() => {
    const { file } = buildDemoFile([demoRide], new Date('2026-11-02T10:00:00Z'))
    server.use(http.get('/demo/rides.json', () => HttpResponse.json(file)))
  })

  it('montre la démo à un visiteur sans sorties, puis la remplace par ses imports', async () => {
    const user = userEvent.setup()
    renderPage(<RidesPage />, { url: '/rides' })

    expect(await screen.findByRole('link', { name: 'Col de la démo' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent("Démonstration : 1 sortie réelle de l'auteur")

    await user.upload(screen.getByLabelText(/Déposer des fichiers/), new File([GPX], 'matin.gpx'))

    expect(await screen.findByRole('link', { name: 'Boucle du matin' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Col de la démo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(useRides.getState().demoDismissed).toBe(true)
  })

  it('ne recharge pas la démo une fois retirée', async () => {
    const user = userEvent.setup()
    renderPage(<RidesPage />, { url: '/rides' })
    await user.click(await screen.findByRole('button', { name: 'Retirer la démo' }))

    expect(await screen.findByText("Aucune sortie pour l'instant.")).toBeInTheDocument()
    expect(useRides.getState().demoDismissed).toBe(true)
  })
})
