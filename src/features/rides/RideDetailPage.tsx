import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/ChartCard'
import { Highlights } from '@/components/Highlights'
import { Panel } from '@/components/Panel'
import { EmptyState } from '@/components/QueryState'
import { formatDateTime, formatDecimal, formatHours } from '@/lib/format'
import { useRides, useRidesHydrated } from '@/store/rides'
import { RideMap } from './RideMap'
import { RideVsTour } from './RideVsTour'
import { RideWeather } from './RideWeather'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const axisProps = { stroke: 'var(--chart-axis)', tick: { fill: 'var(--muted)', fontSize: 12 } }

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text)',
}

export default function RideDetailPage() {
  const { id } = useParams()
  const ride = useRides((s) => s.rides.find((r) => r.id === id))
  const hydrated = useRidesHydrated()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  useDocumentTitle(ride?.name ?? 'Sortie introuvable')

  if (!ride && !hydrated) {
    return (
      <p aria-busy="true" className="meta">
        Chargement de la sortie…
      </p>
    )
  }
  if (!ride) {
    return (
      <EmptyState>
        Sortie introuvable. <Link to="/rides">Retour à mes sorties</Link>
      </EmptyState>
    )
  }

  // Les deux graphiques partagent le même survol (syncId) et pilotent le repère sur la carte.
  const onHover = (state: { activeTooltipIndex?: number | string | null }) => {
    const index = state.activeTooltipIndex
    setHoverIndex(index === undefined || index === null ? null : Number(index))
  }
  const hasElevation = ride.track.every((p) => p.ele !== null)
  const hasSpeed = ride.track.some((p) => p.speed !== null)
  const kmTick = (km: number) => `${Math.round(km)} km`
  // Axe d'altitude arrondi à la centaine pour des graduations lisibles (400, 600, 800…).
  const elevations = ride.track.map((p) => p.ele ?? 0)
  const elevationDomain = [
    Math.floor(Math.min(...elevations) / 100) * 100,
    Math.ceil(Math.max(...elevations) / 100) * 100,
  ]

  return (
    <article aria-labelledby="ride-title">
      <p>
        <Link to="/rides">← Mes sorties</Link>
      </p>
      <h1 id="ride-title">{ride.name}</h1>
      <p className="subtitle">
        {ride.startTime ? formatDateTime(ride.startTime) : 'Sortie non datée'} · {ride.fileName}
      </p>

      <Highlights
        label="Chiffres clés de la sortie"
        items={[
          { value: formatDecimal(ride.distanceKm), label: 'Kilomètres' },
          {
            value: ride.elevationGain === null ? '–' : Math.round(ride.elevationGain),
            label: 'm de dénivelé',
          },
          {
            value: ride.movingSeconds === null ? '–' : formatHours(ride.movingSeconds),
            label: 'En mouvement',
          },
          {
            value: ride.avgSpeedKmh === null ? '–' : formatDecimal(ride.avgSpeedKmh),
            label: 'km/h de moyenne',
          },
          {
            value: ride.maxSpeedKmh === null ? '–' : formatDecimal(ride.maxSpeedKmh),
            label: 'km/h max',
          },
        ]}
      />

      <div className="ride-grid">
        <Panel title="Parcours">
          <RideMap track={ride.track} hoverIndex={hoverIndex} />
        </Panel>
        <Panel title="Météo pendant la sortie">
          <RideWeather ride={ride} />
        </Panel>
      </div>

      <div className="chart-stack">
        {hasElevation && (
          <ChartCard
            title="Profil d'altitude"
            description="Survolez le profil : la position s'affiche sur la carte."
            table={{
              columns: ['Km', 'Altitude'],
              rows: ride.track
                .filter((_, i) => i % 25 === 0)
                .map((p) => [formatDecimal(p.km), `${p.ele} m`]),
            }}
          >
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart
                data={ride.track}
                syncId="ride"
                onMouseMove={onHover}
                onMouseLeave={() => setHoverIndex(null)}
                margin={{ top: 8, right: 16, bottom: 4, left: 4 }}
              >
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="km"
                  type="number"
                  domain={[0, 'dataMax']}
                  tickFormatter={kmTick}
                  {...axisProps}
                />
                <YAxis
                  width={52}
                  domain={elevationDomain}
                  tickFormatter={(v: number) => `${Math.round(v)} m`}
                  {...axisProps}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(km) => `${formatDecimal(Number(km))} km`}
                  formatter={(value) => [`${value} m`, 'Altitude']}
                />
                <Area
                  type="monotone"
                  dataKey="ele"
                  stroke="var(--chart-emph)"
                  strokeWidth={2}
                  fill="var(--chart-emph)"
                  fillOpacity={0.15}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {hasSpeed && (
          <ChartCard
            title="Vitesse"
            description="Lissée sur quelques points pour gommer les imprécisions du GPS."
            table={{
              columns: ['Km', 'Vitesse'],
              rows: ride.track
                .filter((_, i) => i % 25 === 0)
                .map((p) => [formatDecimal(p.km), p.speed === null ? '–' : `${p.speed} km/h`]),
            }}
          >
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={ride.track}
                syncId="ride"
                onMouseMove={onHover}
                onMouseLeave={() => setHoverIndex(null)}
                margin={{ top: 8, right: 16, bottom: 4, left: 4 }}
              >
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="km"
                  type="number"
                  domain={[0, 'dataMax']}
                  tickFormatter={kmTick}
                  {...axisProps}
                />
                <YAxis
                  width={52}
                  tickFormatter={(v: number) => `${Math.round(v)}`}
                  {...axisProps}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(km) => `${formatDecimal(Number(km))} km`}
                  formatter={(value) => [`${value} km/h`, 'Vitesse']}
                />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="var(--series-1)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      <Panel title="Ma sortie vs le Tour">
        <RideVsTour ride={ride} />
      </Panel>
    </article>
  )
}
