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

/** 150 -> « 2 min 30 s » ; 3743 -> « 1 h 02 min 23 s » */
export function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (h) return `${h} h ${pad(m)} min ${pad(s)} s`
  if (m) return `${m} min ${pad(s)} s`
  return `${s} s`
}

/** 5520 -> « 1 h 32 » ; 2700 -> « 45 min » */
export function formatHours(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.round((totalSeconds % 3600) / 60)
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`
}

const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(timestamp: number) {
  return dateTimeFormat.format(new Date(timestamp))
}

const decimalFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 })

export function formatDecimal(value: number) {
  return decimalFormat.format(value)
}
