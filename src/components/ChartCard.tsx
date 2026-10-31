import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  /** Vue tableau des mêmes données : l'information ne passe jamais que par le graphique. */
  table: { columns: string[]; rows: (string | number)[][] }
}

export function ChartCard({ title, description, children, table }: ChartCardProps) {
  return (
    <figure className="chart-card">
      <figcaption>
        <h2>{title}</h2>
        {description && <p className="note">{description}</p>}
      </figcaption>
      {children}
      <details>
        <summary>Voir les données</summary>
        <table>
          <thead>
            <tr>
              {table.columns.map((c) => (
                <th key={c} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
