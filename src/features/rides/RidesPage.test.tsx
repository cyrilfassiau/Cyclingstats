import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderPage } from '@/test/render'
import { useRides } from '@/store/rides'
import RidesPage from './RidesPage'

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
    expect(screen.getByText("Aucune sortie pour l'instant.")).toBeInTheDocument()

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
