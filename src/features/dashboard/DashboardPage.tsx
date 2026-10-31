import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { gcLeadQuery } from '@/api/queries'
import { ChartCard } from '@/components/ChartCard'
import { EmptyState, ErrorState } from '@/components/QueryState'
import { formatDuration } from '@/lib/format'
import { CompareButton, FavoriteButton } from '@/features/riders/RiderActions'
import { compareByGc, type RiderStats } from '@/features/riders/stats'
import { useRiderStats } from '@/features/riders/useRiderStats'
import { RiderBarChart, type RiderBarDatum } from './RiderBarChart'

const GAP_TOP = 15

function toBars(stats: RiderStats[], value: (s: RiderStats) => number | undefined) {
  return stats.flatMap((s): RiderBarDatum[] => {
    const v = value(s)
    return v ? [{ riderId: s.rider.id, name: s.rider.name, value: v }] : []
  })
}

function minutes(seconds: number) {
  return seconds / 60
}

const formatMinutes = (m: number) => `${Math.round(m * 10) / 10} min`
const formatCount = (n: number) => String(n)

export default function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const stats = useRiderStats()
  const gcLead = useQuery(gcLeadQuery)

  const sorted = useMemo(() => [...(stats.data?.values() ?? [])].sort(compareByGc), [stats.data])
  const selectedId = params.get('rider') ?? sorted[0]?.rider.id
  const selected = selectedId ? stats.data?.get(selectedId) : undefined

  const select = (riderId: string) =>
    setParams((prev) => {
      prev.set('rider', riderId)
      return prev
    })

  const charts = useMemo(() => {
    const gap = sorted
      .filter((s) => s.gcRank !== undefined && s.gcRank <= GAP_TOP)
      .map((s) => ({ riderId: s.rider.id, name: s.rider.name, value: minutes(s.gapSeconds ?? 0) }))
    const wins = toBars(sorted, (s) => s.stageWins).sort((a, b) => b.value - a.value)
    const yellow = toBars(sorted, (s) => s.yellowDays).sort((a, b) => b.value - a.value)
    const points = toBars(sorted, (s) => s.points).sort((a, b) => b.value - a.value)
    return { gap, wins, yellow, points }
  }, [sorted])

  if (stats.isPending) return <p aria-busy="true">Chargement des statistiques…</p>
  if (stats.error) return <ErrorState error={stats.error} onRetry={stats.retry} />
  if (!selected) return <EmptyState>Coureur introuvable.</EmptyState>

  const absentFrom = (data: RiderBarDatum[]) =>
    data.some((d) => d.riderId === selected.rider.id) ? undefined : (
      <p className="note">{selected.rider.name} n'apparaît pas dans ce classement.</p>
    )

  const ridersById = stats.data
  const leadData = (gcLead.data?.items ?? []).map((p) => ({
    stage: `Ét. ${p.afterStage}`,
    minutes: minutes(p.leadSeconds),
    leader: ridersById?.get(p.leaderId)?.rider.name ?? p.leaderId,
    second: ridersById?.get(p.secondId)?.rider.name ?? p.secondId,
  }))

  return (
    <section aria-labelledby="dashboard-title">
      <h1 id="dashboard-title">Analyse</h1>
      <p className="subtitle">
        Cliquez sur un coureur dans n'importe quel graphique : tous les graphiques le mettent en
        évidence.
      </p>

      <div className="rider-card">
        <label>
          Coureur sélectionné
          <select value={selected.rider.id} onChange={(e) => select(e.target.value)}>
            {sorted.map((s) => (
              <option key={s.rider.id} value={s.rider.id}>
                {s.gcRank ? `${s.gcRank}. ` : ''}
                {s.rider.name}
              </option>
            ))}
          </select>
        </label>
        <div className="rider-card-head">
          <h2>{selected.rider.name}</h2>
          <FavoriteButton riderId={selected.rider.id} riderName={selected.rider.name} />
          <CompareButton riderId={selected.rider.id} riderName={selected.rider.name} />
        </div>
        <p className="note">
          {selected.teamName} · {selected.rider.nationality}
        </p>
        <dl className="facts">
          <div>
            <dt>Classement général</dt>
            <dd>
              {selected.gcRank
                ? `${selected.gcRank}e${selected.gapSeconds ? ` à ${formatDuration(selected.gapSeconds)}` : ''}`
                : `Abandon${selected.rider.abandonedOnStage ? `, étape ${selected.rider.abandonedOnStage}` : ''}`}
            </dd>
          </div>
          <div>
            <dt>Victoires d'étape</dt>
            <dd>{selected.stageWins}</dd>
          </div>
          <div>
            <dt>Jours en jaune</dt>
            <dd>{selected.yellowDays}</dd>
          </div>
          <div>
            <dt>Maillot vert</dt>
            <dd>
              {selected.pointsRank ? `${selected.pointsRank}e (${selected.points} pts)` : 'Hors top 10'}
            </dd>
          </div>
          <div>
            <dt>Maillot à pois</dt>
            <dd>
              {selected.mountainsRank
                ? `${selected.mountainsRank}e (${selected.mountainPoints} pts)`
                : 'Hors top 10'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="chart-grid">
        <ChartCard
          title={`Écart au vainqueur, top ${GAP_TOP}`}
          description="Classement général final, en minutes."
          table={{
            columns: ['Coureur', 'Écart'],
            rows: charts.gap.map((d) => [d.name, formatDuration(Math.round(d.value * 60))]),
          }}
        >
          <RiderBarChart
            data={charts.gap}
            selectedId={selected.rider.id}
            onSelect={select}
            formatValue={formatMinutes}
          />
          {absentFrom(charts.gap)}
        </ChartCard>

        <ChartCard
          title="Victoires d'étape"
          table={{ columns: ['Coureur', 'Victoires'], rows: charts.wins.map((d) => [d.name, d.value]) }}
        >
          <RiderBarChart
            data={charts.wins}
            selectedId={selected.rider.id}
            onSelect={select}
            formatValue={formatCount}
            allowDecimals={false}
          />
          {absentFrom(charts.wins)}
        </ChartCard>

        <ChartCard
          title="Jours en maillot jaune"
          description="Porteur du maillot à l'issue de chaque étape."
          table={{ columns: ['Coureur', 'Jours'], rows: charts.yellow.map((d) => [d.name, d.value]) }}
        >
          <RiderBarChart
            data={charts.yellow}
            selectedId={selected.rider.id}
            onSelect={select}
            formatValue={formatCount}
            allowDecimals={false}
          />
          {absentFrom(charts.yellow)}
        </ChartCard>

        <ChartCard
          title="Maillot vert, top 10"
          description="Points au classement final."
          table={{ columns: ['Coureur', 'Points'], rows: charts.points.map((d) => [d.name, d.value]) }}
        >
          <RiderBarChart
            data={charts.points}
            selectedId={selected.rider.id}
            onSelect={select}
            formatValue={formatCount}
            allowDecimals={false}
          />
          {absentFrom(charts.points)}
        </ChartCard>

        <ChartCard
          title="Avance du leader sur son dauphin"
          description="Seuls 5 moments vérifiés sont disponibles : le classement étape par étape n'est pas dans le jeu de données."
          table={{
            columns: ['Après', 'Leader', 'Deuxième', 'Avance'],
            rows: leadData.map((d) => [d.stage, d.leader, d.second, formatMinutes(d.minutes)]),
          }}
        >
          {gcLead.isError ? (
            <ErrorState error={gcLead.error} onRetry={() => gcLead.refetch()} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={leadData} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="stage" stroke="var(--chart-axis)" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <YAxis
                  tickFormatter={formatMinutes}
                  width={64}
                  stroke="var(--chart-axis)"
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value, _name, item) => [
                    `${formatMinutes(Number(value))} (${item.payload.leader} devant ${item.payload.second})`,
                    '',
                  ]}
                  separator=""
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    color: 'var(--text)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke="var(--series-1)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--series-1)', stroke: 'var(--surface)', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </section>
  )
}
