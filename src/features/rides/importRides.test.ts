import { strToU8, zipSync } from 'fflate'
import { makeFit } from '@/test/fitFixture'
import { importActivities, type ActivitySource } from './importRides'

const gpx = (start: string) => `<?xml version="1.0"?>
<gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Matin</name><trkseg>
  <trkpt lat="45.00" lon="6.0"><ele>400</ele><time>${start}</time></trkpt>
  <trkpt lat="45.01" lon="6.0"><ele>410</ele><time>2026-10-01T08:02:00Z</time></trkpt>
</trkseg></trk></gpx>`

const source = (fileName: string, data: Uint8Array): ActivitySource => ({
  fileName,
  bytes: async () => data,
})

describe('importActivities', () => {
  it('fouille une archive Garmin, y compris les zip imbriqués', async () => {
    const inner = zipSync({
      'sortie-velo.fit': makeFit(),
      'footing.fit': makeFit({
        sport: 'running',
        subSport: 'generic',
        start: new Date('2026-09-13T07:00:00Z'),
      }),
    })
    const archive = zipSync({
      'DI_CONNECT/DI-Connect-Uploaded-Files/UploadedFiles_0-_Part1.zip': inner,
      'DI_CONNECT/DI-Connect-Wellness/sommeil.json': strToU8('{}'),
      'matin.gpx': strToU8(gpx('2026-10-01T08:00:00Z')),
    })

    const progress: number[] = []
    const summary = await importActivities([source('export-garmin.zip', archive)], [], (done) =>
      progress.push(done),
    )

    expect(summary.added.map((r) => r.fileName).sort()).toEqual(['matin.gpx', 'sortie-velo.fit'])
    expect(summary.skipped).toBe(1)
    expect(summary.failed).toBe(0)
    expect(progress.at(-1)).toBe(3)
  })

  it('reconnaît la même sortie exportée en GPX puis en FIT', async () => {
    const first = await importActivities([source('sortie.fit', makeFit())], [])
    const again = await importActivities(
      [source('sortie.gpx', strToU8(gpx('2026-09-12T08:00:30Z')))],
      first.added,
    )
    expect(again.added).toHaveLength(0)
    expect(again.duplicates).toBe(1)
  })

  it('signale les formats non pris en charge et les archives corrompues', async () => {
    const summary = await importActivities(
      [source('photo.jpg', new Uint8Array([1, 2])), source('casse.zip', strToU8('pas un zip'))],
      [],
    )
    expect(summary.failed).toBe(2)
    expect(summary.messages.map((m) => m.text)).toEqual([
      'photo.jpg : format non pris en charge (GPX, FIT ou ZIP).',
      'casse.zip : archive zip illisible.',
    ])
  })
})
