import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Page introuvable')
  return (
    <section aria-labelledby="not-found-title">
      <h1 id="not-found-title">Page introuvable</h1>
      <p>
        Cette adresse ne correspond à aucune page. <Link to="/stages">Revenir aux étapes</Link>
      </p>
    </section>
  )
}
