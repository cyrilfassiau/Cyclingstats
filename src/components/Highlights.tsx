interface Highlight {
  value: string | number
  label: string
}

/** Bandeau sombre de chiffres clés. */
export function Highlights({ items, label }: { items: Highlight[]; label: string }) {
  return (
    <dl className="highlights" aria-label={label}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
