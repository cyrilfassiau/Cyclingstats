import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from 'react-leaflet'
import type { TrackSample } from './rideStats'

interface RideMapProps {
  track: TrackSample[]
  /** Index du point survolé dans les graphiques, affiché sur la carte. */
  hoverIndex: number | null
}

export function RideMap({ track, hoverIndex }: RideMapProps) {
  const lats = track.map((p) => p.lat)
  const lons = track.map((p) => p.lon)
  const bounds: [[number, number], [number, number]] = [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ]
  const positions = track.map((p): [number, number] => [p.lat, p.lon])
  const start = track[0]
  const end = track[track.length - 1]
  const hover = hoverIndex === null ? undefined : track[hoverIndex]

  return (
    <div className="map" role="region" aria-label="Carte du parcours de la sortie">
      <MapContainer bounds={bounds} boundsOptions={{ padding: [16, 16] }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={positions} pathOptions={{ color: 'var(--route)', weight: 4 }} />
        {start && (
          <CircleMarker
            center={[start.lat, start.lon]}
            radius={6}
            pathOptions={{ color: '#141414', fillColor: '#2f9e44', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip>Départ</Tooltip>
          </CircleMarker>
        )}
        {end && (
          <CircleMarker
            center={[end.lat, end.lon]}
            radius={6}
            pathOptions={{ color: '#141414', fillColor: '#ffffff', fillOpacity: 1, weight: 2 }}
          >
            <Tooltip>Arrivée</Tooltip>
          </CircleMarker>
        )}
        {hover && (
          <CircleMarker
            center={[hover.lat, hover.lon]}
            radius={7}
            pathOptions={{ color: '#141414', fillColor: '#ffc400', fillOpacity: 1, weight: 2 }}
          />
        )}
      </MapContainer>
    </div>
  )
}
