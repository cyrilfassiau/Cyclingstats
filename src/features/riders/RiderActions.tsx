import { StarIcon } from '@/components/Icons'
import { MAX_COMPARED, usePreferences } from '@/store/preferences'

interface RiderActionsProps {
  riderId: string
  riderName: string
}

export function FavoriteButton({ riderId, riderName }: RiderActionsProps) {
  const isFavorite = usePreferences((s) => s.favorites.includes(riderId))
  const toggleFavorite = usePreferences((s) => s.toggleFavorite)

  return (
    <button
      type="button"
      className="icon-button"
      aria-pressed={isFavorite}
      aria-label={`${isFavorite ? 'Retirer' : 'Ajouter'} ${riderName} ${isFavorite ? 'des' : 'aux'} favoris`}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      onClick={() => toggleFavorite(riderId)}
    >
      <StarIcon filled={isFavorite} />
    </button>
  )
}

export function CompareButton({ riderId, riderName }: RiderActionsProps) {
  const isCompared = usePreferences((s) => s.compared.some((c) => c.id === riderId))
  const isFull = usePreferences((s) => s.compared.length >= MAX_COMPARED)
  const toggleCompared = usePreferences((s) => s.toggleCompared)

  return (
    <button
      type="button"
      aria-pressed={isCompared}
      disabled={!isCompared && isFull}
      title={!isCompared && isFull ? `Comparateur plein (${MAX_COMPARED} coureurs)` : undefined}
      aria-label={`${isCompared ? 'Retirer' : 'Ajouter'} ${riderName} ${isCompared ? 'du' : 'au'} comparateur`}
      onClick={() => toggleCompared(riderId)}
    >
      {isCompared ? 'Comparé' : 'Comparer'}
    </button>
  )
}
