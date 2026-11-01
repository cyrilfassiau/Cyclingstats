import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderPage } from '@/test/render'
import { server } from '@/test/server'
import StageDetailPage from './StageDetailPage'

describe('page Détail d’étape', () => {
  it('signale une étape inexistante (404) sans proposer de réessayer', async () => {
    renderPage(<StageDetailPage />, { url: '/stages/99', path: '/stages/:id' })
    expect(await screen.findByText("Cette étape n'existe pas.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument()
  })

  it('enchaîne géocodage puis archive météo pour l’arrivée', async () => {
    const requested: string[] = []
    server.use(
      http.get('https://geocoding-api.open-meteo.com/v1/search', ({ request }) => {
        requested.push(new URL(request.url).searchParams.get('name') ?? '')
        return HttpResponse.json({
          results: [
            { name: "L'Alpe d'Huez", latitude: 45.09, longitude: 6.07, country_code: 'FR' },
          ],
        })
      }),
      http.get('https://archive-api.open-meteo.com/v1/archive', ({ request }) => {
        const params = new URL(request.url).searchParams
        requested.push(
          `${params.get('latitude')},${params.get('longitude')},${params.get('start_date')}`,
        )
        return HttpResponse.json({
          hourly: {
            time: ['2026-07-25T14:00', '2026-07-25T15:00', '2026-07-25T16:00', '2026-07-25T17:00'],
            temperature_2m: [18, 19, 20, 21],
            precipitation: [0, 1, 0.5, 0],
            wind_speed_10m: [10, 10, 10, 10],
            wind_direction_10m: [225, 225, 225, 225],
          },
        })
      }),
    )

    renderPage(<StageDetailPage />, { url: '/stages/20', path: '/stages/:id' })

    expect(await screen.findByText('19,5 °C')).toBeInTheDocument()
    expect(screen.getByText('1,5 mm')).toBeInTheDocument()
    expect(screen.getByText(/de SO/)).toBeInTheDocument()
    expect(requested).toEqual(["Alpe d'Huez", '45.09,6.07,2026-07-25'])
  })
})
