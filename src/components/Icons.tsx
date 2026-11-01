// Icônes dessinées en SVG (trait et taille homogènes), décoratives : le texte voisin porte le sens.

interface IconProps {
  size?: number
}

export function StarIcon({ filled, size = 16 }: IconProps & { filled: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CloseIcon({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

export type JerseyKind = 'yellow' | 'green' | 'polka' | 'white'

const JERSEY_PATH =
  'M8.2 3.2L3 6.1l2.1 4.6 2.6-1.1V20.5h8.6V9.6l2.6 1.1L21 6.1l-5.2-2.9c-.6 1.5-2 2.4-3.8 2.4s-3.2-.9-3.8-2.4z'

export function JerseyIcon({ kind, size = 18 }: IconProps & { kind: JerseyKind }) {
  const patternId = `jersey-dots-${size}`
  return (
    <svg
      className="jersey"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {kind === 'polka' && (
        <defs>
          <pattern id={patternId} width="5" height="5" patternUnits="userSpaceOnUse">
            <rect width="5" height="5" fill="#fff" />
            <circle cx="2.5" cy="2.5" r="1.3" fill="var(--jersey-dots)" />
          </pattern>
        </defs>
      )}
      <path
        d={JERSEY_PATH}
        fill={kind === 'polka' ? `url(#${patternId})` : `var(--jersey-${kind})`}
        stroke="var(--jersey-stroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
