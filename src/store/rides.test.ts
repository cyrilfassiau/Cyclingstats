import type { Ride } from '@/features/rides/rideStats'
import { useRides } from './rides'

const ride = (id: string, demo = false): Ride => ({
  id,
  name: id,
  fileName: `${id}.gpx`,
  startTime: null,
  endTime: null,
  distanceKm: 10,
  elevationGain: null,
  movingSeconds: null,
  totalSeconds: null,
  avgSpeedKmh: null,
  maxSpeedKmh: null,
  track: [],
  ...(demo ? { demo } : {}),
})

beforeEach(() => useRides.setState({ rides: [], demoVersion: null, demoDismissed: false }))

describe('sorties et démo', () => {
  it('charge la démo et la remplace par une nouvelle version', () => {
    const { loadDemo } = useRides.getState()
    loadDemo([ride('a'), ride('b')], 'v1')
    loadDemo([ride('c')], 'v2')
    const state = useRides.getState()
    expect(state.rides.map((r) => [r.id, r.demo])).toEqual([['c', true]])
    expect(state.demoVersion).toBe('v2')
  })

  it('remplace la démo dès le premier import de l’utilisateur', () => {
    useRides.getState().loadDemo([ride('a')], 'v1')
    useRides.getState().addRides([ride('mienne')])
    const state = useRides.getState()
    expect(state.rides.map((r) => r.id)).toEqual(['mienne'])
    expect(state.demoDismissed).toBe(true)
  })

  it('ne fait plus revenir la démo une fois retirée ou la liste vidée', () => {
    useRides.getState().loadDemo([ride('a')], 'v1')
    useRides.getState().dismissDemo()
    expect(useRides.getState()).toMatchObject({ rides: [], demoDismissed: true })

    useRides.setState({ demoDismissed: false })
    useRides.getState().clearRides()
    expect(useRides.getState().demoDismissed).toBe(true)
  })
})
