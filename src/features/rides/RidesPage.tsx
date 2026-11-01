import { useMemo, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/components/ChartCard'
import { Highlights } from '@/components/Highlights'
import { CloseIcon } from '@/components/Icons'
import { EmptyState } from '@/components/QueryState'
import { formatDecimal, formatHours } from '@/lib/format'
import { useRides } from '@/store/rides'
import { importGpx, sampleSources, type GpxSource, type ImportResult } from './importRides'
import { groupByMonth } from './rideStats'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function monthLabel(month: string) {
  return monthFormat.format(new Date(`${month}-15T12:00:00`))
}

export default function RidesPage() {
  const rides = useRides((s) => s.rides)
  const addRides = useRides((s) => s.addRides)
  const removeRide = useRides((s) => s.removeRide)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [messages, setMessages] = useState<ImportResult['messages']>([])
  useDocumentTitle('Mes sorties')

  const sorted = useMemo(
    () => [...rides].sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0)),
    [rides],
  )
  const months = useMemo(() => groupByMonth(rides), [rides])
  const totals = useMemo(
    () => ({
      km: rides.reduce((sum, r) => sum + r.distanceKm, 0),
      gain: rides.reduce((sum, r) => sum + (r.elevationGain ?? 0), 0),
      seconds: rides.reduce((sum, r) => sum + (r.movingSeconds ?? 0), 0),
    }),
    [rides],
  )

  async function runImport(sources: GpxSource[]) {
    if (sources.length === 0) return
    setBusy(true)
    const result = await importGpx(sources, useRides.getState().rides)
    if (result.added.length) addRides(result.added)
    setMessages(result.messages)
    setBusy(false)
  }

  const fromFiles = (files: FileList | null) =>
    runImport([...(files ?? [])].map((file) => ({ fileName: file.name, read: () => file.text() })))

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    void fromFiles(event.dataTransfer.files)
  }

  return (
    <section aria-labelledby="rides-title">
      <h1 id="rides-title">Mes sorties</h1>
      <p className="subtitle">
        Importez vos fichiers GPX : ils sont lus dans votre navigateur, rien n'est envoyé sur un
        serveur.
      </p>

      <div className="import-row">
        <label
          className={dragging ? 'dropzone dragging' : 'dropzone'}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className="dropzone-title">Déposer des fichiers GPX ici</span>
          <span className="meta">ou cliquer pour les choisir (plusieurs possibles)</span>
          <input
            type="file"
            accept=".gpx,application/gpx+xml"
            multiple
            disabled={busy}
            onChange={(e) => {
              void fromFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
        <div className="import-side">
          <button type="button" disabled={busy} onClick={() => runImport(sampleSources())}>
            Charger 3 sorties d'exemple
          </button>
          <p className="meta">Traces générées autour du lac d'Annecy, pas de vraies sorties.</p>
        </div>
      </div>

      <ul className="import-messages" aria-live="polite">
        {busy && <li>Lecture des fichiers…</li>}
        {messages.map((m) => (
          <li key={m.text} className={m.kind === 'error' ? 'msg-error' : 'msg-ok'}>
            {m.text}
          </li>
        ))}
      </ul>

      {rides.length === 0 ? (
        <EmptyState>Aucune sortie pour l'instant.</EmptyState>
      ) : (
        <>
          <Highlights
            label="Totaux de mes sorties"
            items={[
              { value: rides.length, label: rides.length > 1 ? 'Sorties' : 'Sortie' },
              { value: formatDecimal(totals.km), label: 'Kilomètres' },
              { value: Math.round(totals.gain).toLocaleString('fr-FR'), label: 'm de dénivelé' },
              { value: formatHours(totals.seconds), label: 'En mouvement' },
            ]}
          />

          <div className="table-wrap">
            <table>
              <caption className="panel-title">
                {rides.length} sortie{rides.length > 1 ? 's' : ''}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Sortie</th>
                  <th scope="col" className="num">
                    Distance
                  </th>
                  <th scope="col" className="num">
                    D+
                  </th>
                  <th scope="col" className="num">
                    Temps
                  </th>
                  <th scope="col" className="num">
                    Moyenne
                  </th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((ride) => (
                  <tr key={ride.id}>
                    <td className="meta">
                      {ride.startTime ? dayFormat.format(ride.startTime) : 'Non datée'}
                    </td>
                    <td>
                      <Link to={`/rides/${ride.id}`} className="strong-link">
                        {ride.name}
                      </Link>
                    </td>
                    <td className="num">{formatDecimal(ride.distanceKm)} km</td>
                    <td className="num">
                      {ride.elevationGain === null ? '–' : `${Math.round(ride.elevationGain)} m`}
                    </td>
                    <td className="num">
                      {ride.movingSeconds === null ? '–' : formatHours(ride.movingSeconds)}
                    </td>
                    <td className="num">
                      {ride.avgSpeedKmh === null ? '–' : `${formatDecimal(ride.avgSpeedKmh)} km/h`}
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Supprimer la sortie ${ride.name}`}
                        title="Supprimer"
                        onClick={() => removeRide(ride.id)}
                      >
                        <CloseIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {months.length > 0 && (
            <div className="chart-grid">
              <ChartCard
                title="Kilomètres par mois"
                table={{
                  columns: ['Mois', 'Sorties', 'Distance', 'D+', 'En mouvement'],
                  rows: months.map((m) => [
                    monthLabel(m.month),
                    m.count,
                    `${formatDecimal(m.distanceKm)} km`,
                    `${Math.round(m.elevationGain)} m`,
                    formatHours(m.movingSeconds),
                  ]),
                }}
              >
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={months.map((m) => ({ label: monthLabel(m.month), km: m.distanceKm }))}
                    margin={{ top: 8, right: 8, bottom: 4, left: 4 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="label"
                      stroke="var(--chart-axis)"
                      tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    />
                    <YAxis
                      width={40}
                      stroke="var(--chart-axis)"
                      tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--row-hover)' }}
                      formatter={(value) => [`${formatDecimal(Number(value))} km`, '']}
                      separator=""
                      contentStyle={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 4,
                        color: 'var(--text)',
                      }}
                    />
                    <Bar
                      dataKey="km"
                      fill="var(--chart-emph)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={56}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}
        </>
      )}
    </section>
  )
}
