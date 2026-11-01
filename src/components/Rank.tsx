/** Rang dans une case ; le vainqueur est mis en avant par le fond jaune. */
export function Rank({ value }: { value: number }) {
  return <span className={value === 1 ? 'rank rank-1' : 'rank'}>{value}</span>
}
