/** Renvoie la valeur si elle fait partie des valeurs autorisées, sinon undefined. */
export function oneOf<T extends string>(value: string | null, allowed: readonly T[]) {
  return allowed.find((item) => item === value)
}

export function positiveInt(value: string | null, fallback: number) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : fallback
}

/** Construit une query string en omettant les valeurs vides ou égales au défaut. */
export function compactParams(
  values: Record<string, string | number | undefined>,
  defaults: Record<string, string | number> = {},
) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === '' || value === defaults[key]) continue
    params.set(key, String(value))
  }
  return params
}
