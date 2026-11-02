import { useQuery } from '@tanstack/react-query'

import { metaQuery } from '@/api/queries'


/** Bandeau de l'édition sous le header. */


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
                {i > 0 && ' - '}
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
