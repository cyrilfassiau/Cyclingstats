import type { ReactNode } from 'react'

interface ErrorStateProps {
  error: Error
  onRetry: () => void
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="state state-error" role="alert">
      <p>Impossible de charger les données. {error.message}</p>
      <button type="button" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="state">{children}</p>
}

export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="skeleton-table" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="skeleton-row">
          {Array.from({ length: columns }, (_, c) => (
            <span key={c} className="skeleton" />
          ))}
        </div>
      ))}
    </div>
  )
}
