const EARTH_RADIUS_KM = 6371.0088

export interface LatLon {
  lat: number
  lon: number
}

/** Distance à vol d'oiseau entre deux points (formule de haversine), en km. */
export function haversineKm(a: LatLon, b: LatLon) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const

/** 225 -> « SO ». Direction d'où vient le vent, en points cardinaux français. */
export function compassPoint(degrees: number) {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % 8
  return COMPASS[index] ?? 'N'
}
