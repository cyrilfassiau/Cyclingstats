#!/usr/bin/env node
/**
 * Captures d'écran du README, prises dans Chrome sans interface via le protocole DevTools
 * (aucune dépendance : WebSocket et fetch sont intégrés à Node 22+).
 *
 * Prérequis : l'appli tourne (`npm run dev`) et Google Chrome est installé.
 * Usage : node scripts/screenshots.mjs [url de base]   ->  écrit docs/screenshots/*.png
 * Chemin de Chrome modifiable avec la variable CHROME_PATH.
 */
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const OUT = new URL('../docs/screenshots/', import.meta.url)
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PORT = 9333

const PREFERENCES = {
  state: {
    favorites: ['tadej-pogacar', 'paul-seixas'],
    compared: [
      { id: 'tadej-pogacar', slot: 0 },
      { id: 'remco-evenepoel', slot: 1 },
      { id: 'isaac-del-toro', slot: 2 },
      { id: 'paul-seixas', slot: 3 },
    ],
    theme: 'system',
  },
  version: 1,
}

const SHOTS = [
  { file: 'etapes.png', path: '/stages' },
  { file: 'classement.png', path: '/gc?nationality=FRA' },
  { file: 'analyse.png', path: '/dashboard?rider=remco-evenepoel', height: 1250 },
  { file: 'comparateur.png', path: '/compare', height: 1100 },
  { file: 'sortie.png', path: 'RIDE', height: 1300 },
  { file: 'analyse-sombre.png', path: '/dashboard?rider=isaac-del-toro', dark: true, height: 1250 },
  { file: 'mobile.png', path: '/stages', width: 390, height: 844, mobile: true },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForChrome() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = targets.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      // Chrome n'écoute pas encore
    }
    await sleep(200)
  }
  throw new Error('Chrome ne répond pas sur le port de débogage')
}

function connect(url) {
  const socket = new WebSocket(url)
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message))
      else resolve(message.result)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      id += 1
      pending.set(id, { resolve, reject })
      socket.send(JSON.stringify({ id, method, params }))
    })
  return new Promise((resolve) => socket.addEventListener('open', () => resolve({ send, socket })))
}

async function evaluate(send, expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (exceptionDetails) throw new Error(exceptionDetails.text)
  return result.value
}

const profile = await mkdtemp(join(tmpdir(), 'cyclingstats-shots-'))
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ],
  { stdio: 'ignore' },
)

try {
  const { send, socket } = await connect(await waitForChrome())
  await send('Page.enable')
  await send('Runtime.enable')

  // Première visite : préférences de démo ; la page Mes sorties charge d'elle-même la démo
  // publiée dans public/demo/rides.json.
  await send('Page.navigate', { url: `${BASE}/rides` })
  await sleep(3000)
  await evaluate(
    send,
    `localStorage.setItem('cyclingstats-preferences', ${JSON.stringify(JSON.stringify(PREFERENCES))})`,
  )
  await send('Page.reload')
  await sleep(3000)
  // Les sorties sont rangées dans IndexedDB : on lit l'adresse de la plus récente dans le tableau.
  const ridePath = await evaluate(
    send,
    `document.querySelector('tbody a[href^="/rides/"]')?.getAttribute('href') ?? null`,
  )
  if (!ridePath)
    console.warn('Aucune sortie de démo (public/demo/rides.json) : capture de sortie ignorée.')

  await mkdir(OUT, { recursive: true })
  for (const shot of SHOTS) {
    const width = shot.width ?? 1280
    const height = shot.height ?? 900
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: Boolean(shot.mobile),
    })
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: shot.dark ? 'dark' : 'light' }],
    })
    if (shot.path === 'RIDE' && !ridePath) continue
    const path = shot.path === 'RIDE' ? ridePath : shot.path
    await send('Page.navigate', { url: `${BASE}${path}` })
    // Laisse le temps aux données (fausse API, Open-Meteo, tuiles de carte) d'arriver.
    await sleep(shot.path === 'RIDE' ? 6000 : 3500)
    const { data } = await send('Page.captureScreenshot', { format: 'png' })
    await writeFile(new URL(shot.file, OUT), Buffer.from(data, 'base64'))
    console.log(`OK -> docs/screenshots/${shot.file}`)
  }
  socket.close()
} finally {
  chrome.kill()
  await sleep(300)
  await rm(profile, { recursive: true, force: true })
}
