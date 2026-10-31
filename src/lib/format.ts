const dateFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

export function formatDate(iso: string) {
  return dateFormat.format(new Date(`${iso}T12:00:00`))
}

const kmFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

export function formatKm(km: number) {
  return `${kmFormat.format(km)} km`
}

/** Minuscules et sans accents, pour une recherche tolérante (« pogacar » trouve « Pogačar »). */
export function normalizeText(text: string) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
