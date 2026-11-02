import { useMemo, useState, type DragEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartCard } from '@/components/ChartCard'
import { Highlights } from '@/components/Highlights'
import { CloseIcon } from '@/components/Icons'
import { Pagination } from '@/components/Pagination'
import { Panel } from '@/components/Panel'
import { EmptyState } from '@/components/QueryState'
import { formatDecimal, formatHours } from '@/lib/format'
import { useRides, useRidesHydrated } from '@/store/rides'
import {
  fileSource,
  importActivities,
  type ActivitySource,
  type ImportSummary,
} from './importRides'
import { groupByPeriod, type Period } from './rideStats'
import { TourRecap } from './TourRecap'
import { DemoBanner } from './DemoBanner'
import { buildDemoFile } from './demo'
import { useDemoRides } from './useDemoRides'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: '2-digit' })
const dayFormat = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const PAGE_SIZE = 25

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

/** Bilan d'un import, en une phrase. */
function summarize(summary: ImportSummary) {
  const parts = [plural(summary.added.length, 'sortie ajoutée', 'sorties ajoutées')]
  if (summary.duplicates) parts.push(plural(summary.duplicates, 'déjà importée', 'déjà importées'))
  if (summary.skipped) parts.push(plural(summary.skipped, 'activité ignorée', 'activités ignorées'))
  if (summary.failed) parts.push(plural(summary.failed, 'fichier illisible', 'fichiers illisibles'))
  return `${parts.join(', ')}.`
}

function periodLabel(key: string, period: Period) {
  return period === 'year' ? key : monthFormat.format(new Date(`${key}-15T12:00:00`))
}

const PERIODS: { value: Period; label: string; title: string; column: string }[] = [
  { value: 'month', label: 'Par mois', title: 'Kilomètres par mois', column: 'Mois' },
  { value: 'year', label: 'Par an', title: 'Kilomètres par an', column: 'Année' },
]

export default function RidesPage() {
  const rides = useRides((s) => s.rides)
  const addRides = useRides((s) => s.addRides)
  const removeRide = useRides((s) => s.removeRide)
  const clearRides = useRides((s) => s.clearRides)
  const hydrated = useRidesHydrated()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [page, setPage] = useState(1)
  // Regroupement du graphique dans l'URL (?periode=an), comme les filtres des autres pages.
  const [params, setParams] = useSearchParams()
  const period: Period = params.get('periode') === 'an' ? 'year' : 'month'
  const periodInfo = PERIODS.find((p) => p.value === period)!
  const setPeriod = (value: Period) =>
    setParams(
      (prev) => {
        if (value === 'year') prev.set('periode', 'an')
        else prev.delete('periode')
        return prev
      },
      { replace: true },
    )
  const busy = progress !== null
  const [exportNote, setExportNote] = useState<string | null>(null)
  useDocumentTitle('Mes sorties')
  useDemoRides()

  const sorted = useMemo(
    () => [...rides].sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0)),
    [rides],
  )
  const periods = useMemo(() => groupByPeriod(rides, period), [rides, period])
  const undatedCount = rides.filter((r) => r.startTime === null).length
  const totals = useMemo(
    () => ({
      km: rides.reduce((sum, r) => sum + r.distanceKm, 0),
      gain: rides.reduce((sum, r) => sum + (r.elevationGain ?? 0), 0),
      seconds: rides.reduce((sum, r) => sum + (r.movingSeconds ?? 0), 0),
    }),
    [rides],
  )

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRides = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  async function runImport(sources: ActivitySource[]) {
    if (sources.length === 0) return
    setSummary(null)
    setProgress({ done: 0, total: 0 })
    try {
      // Les sorties de démo ne comptent pas comme doublons : l'import va les remplacer.
      const ownRides = useRides.getState().rides.filter((r) => !r.demo)
      const result = await importActivities(sources, ownRides, (done, total) =>
        setProgress({ done, total }),
      )
      if (result.added.length) addRides(result.added)
      setSummary(result)
      setPage(1)
    } finally {
      setProgress(null)
    }
  }

  const fromFiles = (files: FileList | null) => runImport([...(files ?? [])].map(fileSource))

  // Outil de l'auteur, visible seulement en développement (npm run dev) : télécharge le
  // fichier de démo à publier dans public/demo/rides.json.
  const ownRideCount = rides.filter((r) => !r.demo).length
  function exportDemo() {
    const { file, dropped } = buildDemoFile(rides.filter((r) => !r.demo))
    const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'rides.json'
    link.click()
    URL.revokeObjectURL(url)
    setExportNote(
      `${plural(file.rides.length, 'sortie exportée', 'sorties exportées')}` +
        (dropped ? `, ${plural(dropped, 'trop courte écartée', 'trop courtes écartées')}` : '') +
        `. Placez rides.json dans public/demo/ puis redéployez.` +
        (file.rides.length > 20 ? ' Conseil : 10 à 20 sorties suffisent pour la démo.' : ''),
    )
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    void fromFiles(event.dataTransfer.files)
  }

  return (
    <section aria-labelledby="rides-title">
      <h1 id="rides-title">Mes sorties</h1>
      <p className="subtitle">
        Importez vos fichiers GPX ou FIT, ou l'archive complète exportée de Garmin Connect : tout
        est lu dans votre navigateur, rien n'est envoyé sur un serveur.
      </p>
      <DemoBanner />

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
          <span className="dropzone-title">Déposer des fichiers GPX, FIT ou ZIP ici</span>
          <span className="meta">ou cliquer pour les choisir (plusieurs possibles)</span>
          <input
            type="file"
            accept=".gpx,.fit,.zip,application/gpx+xml,application/zip"
            multiple
            disabled={busy}
            onChange={(e) => {
              void fromFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      <details className="help">
        <summary>Comment récupérer toutes mes sorties Garmin via Garmin Connect</summary>
        <ol>
          <li>
            <strong>Une sortie</strong> : dans Garmin Connect, ouvrez l'activité puis utilisez
            l'export du fichier d'origine (FIT) ou de la trace GPX.
          </li>
          <li>
            <strong>Tout l'historique</strong> : depuis votre compte Garmin, demandez l'export de
            vos données personnelles. Garmin envoie par e-mail un lien vers une archive .zip.
          </li>
          <li>Déposez l'archive telle quelle.</li>
        </ol>
      </details>

      <div className="import-messages" aria-live="polite">
        {busy && (
          <p>
            {progress.total
              ? `Lecture des fichiers… ${progress.done} / ${progress.total}`
              : 'Ouverture des fichiers…'}
          </p>
        )}
        {summary && <p className="import-summary">{summarize(summary)}</p>}
        {summary && summary.messages.length > 0 && (
          <ul>
            {summary.messages.slice(0, 12).map((m, i) => (
              <li key={i} className={`msg-${m.kind}`}>
                {m.text}
              </li>
            ))}
            {summary.messages.length > 12 && (
              <li className="meta">… et {summary.messages.length - 12} autres messages.</li>
            )}
          </ul>
        )}
      </div>

      {!hydrated ? (
        <p aria-busy="true" className="meta">
          Chargement de vos sorties…
        </p>
      ) : rides.length === 0 ? (
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
              <caption className="panel-title">{plural(rides.length, 'sortie')}</caption>
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
                {pageRides.map((ride) => (
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
          <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
          <p className="clear-rides">
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Supprimer les ${rides.length} sorties de ce navigateur ?`)) {
                  clearRides()
                }
              }}
            >
              Tout supprimer
            </button>
            {import.meta.env.DEV && ownRideCount > 0 && (
              <button type="button" onClick={exportDemo}>
                Exporter la démo ({plural(ownRideCount, 'sortie')})
              </button>
            )}
          </p>
          {exportNote && (
            <p className="meta export-note" aria-live="polite">
              {exportNote}
            </p>
          )}

          {periods.length > 0 && (
            <div className="chart-grid">
              <ChartCard
                title={periodInfo.title}
                description={
                  undatedCount
                    ? `${plural(undatedCount, 'sortie non datée', 'sorties non datées')} : impossible de la ranger dans une période, elle reste comptée dans les totaux et le récap ci-dessous.`
                    : undefined
                }
                table={{
                  columns: [periodInfo.column, 'Sorties', 'Distance', 'D+', 'En mouvement'],
                  rows: periods.map((m) => [
                    periodLabel(m.period, period),
                    m.count,
                    `${formatDecimal(m.distanceKm)} km`,
                    `${Math.round(m.elevationGain)} m`,
                    formatHours(m.movingSeconds),
                  ]),
                }}
              >
                <div className="segmented" role="group" aria-label="Regrouper les kilomètres">
                  {PERIODS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      aria-pressed={period === p.value}
                      onClick={() => setPeriod(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={periods.map((m) => ({
                      label: periodLabel(m.period, period),
                      km: m.distanceKm,
                    }))}
                    margin={{ top: 8, right: 8, bottom: 4, left: 4 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                    <XAxis
                      dataKey="label"
                      stroke="var(--chart-axis)"
                      tick={{ fill: 'var(--muted)', fontSize: 12 }}
                    />
                    <YAxis
                      width={52}
                      stroke="var(--chart-axis)"
                      tick={{ fill: 'var(--muted)', fontSize: 12 }}
                      tickFormatter={(km: number) => km.toLocaleString('fr-FR')}
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

          <Panel title="Mes sorties vs le Tour de France 2026">
            <TourRecap rides={rides} />
          </Panel>
        </>
      )}
    </section>
  )
}
