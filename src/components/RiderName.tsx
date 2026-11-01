import { Link } from 'react-router-dom'

interface RiderNameProps {
  name: string
  team?: string
  to?: string
}

/**
 * Affiche « POGAČAR Tadej » : le premier mot est le prénom, le reste le nom de famille
 * (passé en capitales par le CSS, pour que les lecteurs d'écran lisent le texte normal).
 */
export function RiderName({ name, team, to }: RiderNameProps) {
  const [first = '', ...rest] = name.split(' ')
  const label = (
    <>
      <span className="rider-last">{rest.length ? rest.join(' ') : first}</span>
      {rest.length > 0 && ` ${first}`}
    </>
  )

  return (
    <span className="rider">
      {to ? (
        <Link to={to} className="rider-name">
          {label}
        </Link>
      ) : (
        <span className="rider-name">{label}</span>
      )}
      {team && <span className="rider-team">{team}</span>}
    </span>
  )
}
