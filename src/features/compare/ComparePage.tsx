import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartCard } from '@/components/ChartCard'
import { CloseIcon } from '@/components/Icons'
import { EmptyState, ErrorState } from '@/components/QueryState'
import { formatDuration } from '@/lib/format'
import { compareByGc, type RiderStats } from '@/features/riders/stats'
import { useRiderStats } from '@/features/riders/useRiderStats'
import { MAX_COMPARED, usePreferences } from '@/store/preferences'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

interface ComparedStats {
  stats: RiderStats
  /** Variable CSS de la couleur du coureur (slot fixe). */
  color: string
}

interface Metric {
  label: string
  value: (s: RiderStats) => number | undefined
  format: (value: number) => string
  /** Indique si une valeur plus petite est meilleure (rang, écart). */
  lowerIsBetter?: boolean
}

const METRICS: Metric[] = [
  {
    label: 'Classement général',
    value: (s) => s.gcRank,
    format: (v) => (v === 1 ? '1er' : `${v}e`),
    lowerIsBetter: true,
  },
  {
    label: 'Écart au vainqueur',
    value: (s) => s.gapSeconds,
    format: (v) => (v ? formatDuration(v) : 'Vainqueur'),
    lowerIsBetter: true,
  },
  { label: "Victoires d'étape", value: (s) => s.stageWins, format: String },
  { label: 'Jours en jaune', value: (s) => s.yellowDays, format: String },
  { label: 'Points maillot vert', value: (s) => s.points, format: (v) => `${v} pts` },
  { label: 'Points maillot à pois', value: (s) => s.mountainPoints, format: (v) => `${v} pts` },
]

interface CompareChart {
  title: string
  metric: Metric
  /** Valeur tracée, dans l'unité de l'axe. */
  toValue: (raw: number) => number
  unit: (value: number) => string
}

const CHARTS: CompareChart[] = [
  {
    title: 'Écart au vainqueur (min)',
    metric: METRICS[1]!,
    toValue: (seconds) => seconds / 60,
    unit: (minutes) => `${Math.round(minutes * 10) / 10} min`,
  },
  { title: "Victoires d'étape", metric: METRICS[2]!, toValue: (v) => v, unit: String },
  { title: 'Jours en jaune', metric: METRICS[3]!, toValue: (v) => v, unit: String },
]

function best(metric: Metric, riders: ComparedStats[]) {
  const values = riders.flatMap((r) => {
    const v = metric.value(r.stats)
    return v === undefined ? [] : [v]
  })
  if (values.length < 2) return undefined
  return metric.lowerIsBetter ? Math.min(...values) : Math.max(...values)
}

export default function ComparePage() {
  const stats = useRiderStats()
  const compared = usePreferences((s) => s.compared)
  const toggleCompared = usePreferences((s) => s.toggleCompared)
  const clearCompared = usePreferences((s) => s.clearCompared)
  useDocumentTitle('Comparateur')

  const riders = useMemo(
    () =>
      compared.flatMap((c): ComparedStats[] => {
        const s = stats.data?.get(c.id)
        return s ? [{ stats: s, color: `var(--series-${c.slot + 1})` }] : []
      }),
    [compared, stats.data],
  )
  const candidates = useMemo(
    () =>
      [...(stats.data?.values() ?? [])]
        .filter((s) => !compared.some((c) => c.id === s.rider.id))
        .sort(compareByGc),
    [stats.data, compared],
  )

  if (stats.isPending) return <p aria-busy="true">Chargement des statistiques…</p>
  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.retry} />

  return (
    <section aria-labelledby="compare-title">
      <h1 id="compare-title">Comparateur</h1>

      <div className="filters">
        <label>
          Ajouter un coureur ({riders.length}/{MAX_COMPARED})
          <select
            value=""
            disabled={riders.length >= MAX_COMPARED}
            onChange={(e) => e.target.value && toggleCompared(e.target.value)}
          >
            <option value="">Choisir…</option>
            {candidates.map((s) => (
              <option key={s.rider.id} value={s.rider.id}>
                {s.gcRank ? `${s.gcRank}. ` : ''}
                {s.rider.name}
              </option>
            ))}
          </select>
        </label>
        {riders.length > 0 && (
          <button type="button" className="align-end" onClick={clearCompared}>
            Tout retirer
          </button>
        )}
      </div>

      {riders.length > 0 && (
        <ul className="legend" aria-label="Coureurs comparés">
          {riders.map(({ stats: s, color }) => (
            <li key={s.rider.id}>
              <span className="swatch" style={{ background: color }} aria-hidden="true" />
              <Link to={`/dashboard?rider=${s.rider.id}`}>{s.rider.name}</Link>
              <button
                type="button"
                className="icon-button"
                aria-label={`Retirer ${s.rider.name} du comparateur`}
                onClick={() => toggleCompared(s.rider.id)}
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {riders.length < 2 ? (
        <EmptyState>
          Ajoutez au moins deux coureurs, ici ou depuis la page <Link to="/riders">Coureurs</Link>.
        </EmptyState>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <caption className="panel-title">Comparaison des coureurs</caption>
              <thead>
                <tr>
                  <th scope="col">Statistique</th>
                  {riders.map(({ stats: s }) => (
                    <th key={s.rider.id} scope="col" className="num">
                      {s.rider.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((metric) => {
                  const top = best(metric, riders)
                  return (
                    <tr key={metric.label}>
                      <th scope="row">{metric.label}</th>
                      {riders.map(({ stats: s }) => {
                        const v = metric.value(s)
                        const isBest = v !== undefined && v === top
                        return (
                          <td key={s.rider.id} className={`num${isBest ? ' best' : ''}`}>
                            {v === undefined
                              ? metric.label.startsWith('Points')
                                ? 'Hors top 10'
                                : 'Abandon'
                              : metric.format(v)}
                            {isBest && <span className="visually-hidden"> (meilleur)</span>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="chart-grid">
            {CHARTS.map(({ title, metric, toValue, unit }) => {
              const data = riders.map(({ stats: s, color }) => ({
                name: s.rider.name,
                value: toValue(metric.value(s) ?? 0),
                color,
              }))
              return (
                <ChartCard
                  key={title}
                  title={title}
                  table={{
                    columns: ['Coureur', title],
                    rows: data.map((d) => [d.name, unit(d.value)]),
                  }}
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
                      <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        stroke="var(--chart-axis)"
                        tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        width={40}
                        stroke="var(--chart-axis)"
                        tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--row-hover)' }}
                        formatter={(value) => [unit(Number(value)), '']}
                        separator=""
                        contentStyle={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          color: 'var(--text)',
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                        {data.map((d) => (
                          <Cell key={d.name} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
