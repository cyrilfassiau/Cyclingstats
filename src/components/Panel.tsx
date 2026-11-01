import type { ReactNode } from 'react'

/** Bloc à titre noir, sans graphique ni tableau imposé. */
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2 className="panel-title">{title}</h2>
      <div className="panel-body">{children}</div>
    </section>
  )
}
