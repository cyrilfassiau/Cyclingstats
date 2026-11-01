import { FitBaseType, FitEncoder } from 'fit-file-parser/encoder'

// Numéros du profil FIT : messages et valeurs d'énumération utilisés par les tests.
const MESG = { fileId: 0, session: 18, record: 20 }
const SPORT = { running: 1, cycling: 2 }
const SUB_SPORT = { generic: 0, road: 7, indoor_cycling: 6 }
const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180

export interface FitFixtureOptions {
  sport?: keyof typeof SPORT
  subSport?: keyof typeof SUB_SPORT
  start?: Date
  /** [latitude, longitude, altitude] ; null pour un point sans position (home trainer). */
  points?: ([number, number, number] | null)[]
}

/** Fabrique un vrai fichier FIT binaire, comme ceux d'un compteur Garmin. */
export function makeFit({
  sport = 'cycling',
  subSport = 'road',
  start = new Date('2026-09-12T08:00:00Z'),
  points = [
    [45.0, 6.0, 400],
    [45.01, 6.0, 410],
    [45.02, 6.0, 430],
  ],
}: FitFixtureOptions = {}) {
  const encoder = new FitEncoder()
  const time = (offsetSeconds: number) =>
    FitEncoder.toFitTimestamp(new Date(start.getTime() + offsetSeconds * 1000))

  encoder.writeMessage(MESG.fileId, [{ number: 0, size: 1, baseType: FitBaseType.Enum, value: 4 }])

  points.forEach((point, i) => {
    const timestamp = { number: 253, size: 4, baseType: FitBaseType.Uint32, value: time(i * 120) }
    if (!point) {
      encoder.writeMessage(MESG.record, [timestamp], 1)
      return
    }
    const [lat, lon, ele] = point
    encoder.writeMessage(MESG.record, [
      timestamp,
      {
        number: 0,
        size: 4,
        baseType: FitBaseType.Sint32,
        value: Math.round(lat * SEMICIRCLES_PER_DEGREE),
      },
      {
        number: 1,
        size: 4,
        baseType: FitBaseType.Sint32,
        value: Math.round(lon * SEMICIRCLES_PER_DEGREE),
      },
      { number: 2, size: 2, baseType: FitBaseType.Uint16, value: Math.round((ele + 500) * 5) },
    ])
  })

  encoder.writeMessage(
    MESG.session,
    [
      { number: 2, size: 4, baseType: FitBaseType.Uint32, value: time(0) },
      { number: 5, size: 1, baseType: FitBaseType.Enum, value: SPORT[sport] },
      { number: 6, size: 1, baseType: FitBaseType.Enum, value: SUB_SPORT[subSport] },
    ],
    2,
  )
  return encoder.close()
}
