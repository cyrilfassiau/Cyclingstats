import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { metaQuery } from '@/api/queries'
import { formatDate } from '@/lib/format'

/** Bandeau de l'édition sous le header. */
export function EditionBanner() {
  const meta = useQuery(metaQuery)
  if (!meta.data) return <div className="edition-banner" aria-hidden="true" />

  const m = meta.data
  return (
    <div className="edition-banner">
      <div className="edition-inner">
        <span className="pill">Terminé</span>
        <span className="edition-name">{m.name}</span>
        <span className="edition-route">
          {m.grandDepart.replace(/ \(.*\)$/, '')} → {m.finish.replace(/ \(.*\)$/, '')}
        </span>
        <span className="edition-dates">
          {formatDate(m.startDate)} – {formatDate(m.endDate)}
        </span>
        <Link to="/stages" className="pill pill-accent">
          21 étapes
        </Link>
      </div>
    </div>
  )
}

/** Pied de page : rappel de la nature des données et sources citées. */
export function SiteFooter() {
  const meta = useQuery(metaQuery)

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-wordmark">Cyclingstats</p>
        <p>
          Les résultats sont servis par une API simulée (MSW), à partir d'un jeu de données figé
          préparé une fois en Python. Projet de portfolio, sans lien avec les organisateurs.
        </p>
        {meta.data && (
          <p>
            Sources :{' '}
            {meta.data.sources.map((url, i) => (
              <span key={url}>
                {i > 0 && ' · '}
                <a href={url} rel="noreferrer" target="_blank">
                  {new URL(url).hostname.replace(/^(www|en)\./, '')}
                </a>
              </span>
            ))}
          </p>
        )}
      </div>
    </footer>
  )
}
