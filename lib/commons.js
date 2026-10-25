// Wikimedia Commons helpers: image download and author/licence lookup.
import { access, mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { config } from '../config.js'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const safeDecode = s => { try { return decodeURIComponent(s) } catch { return s } }

// Commons file name ("Nokia 3310 blue.jpg") from a Special:FilePath URL
export const commonsFileName = imageUrl => safeDecode(imageUrl.split('?')[0].split('/').pop()).replace(/_/g, ' ')

// Deterministic local name, e.g. images/Q219691_Nokia_3310_blue.jpg (relative to the example folder)
export const imageFileFor = (qid, imageUrl) =>
  `images/${qid}_${commonsFileName(imageUrl).replace(/\s+/g, '_').replace(/[^\w.()-]/g, '_')}`

export const commonsPageUrl = file => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`

const detect = b => b.subarray(0, 3).toString('hex') === 'ffd8ff' ? 'jpg' : b.subarray(1, 4).toString() === 'PNG' ? 'png'
  : b.subarray(0, 4).toString() === 'RIFF' ? 'webp' : b.subarray(0, 3).toString() === 'GIF' ? 'gif' : null

export const exists = path => access(path).then(() => true, () => false)

// Downloads a thumbnail; returns 'exists' | 'ok' | 'failed'. Honours Retry-After on 429. Throttles after real downloads.
export async function downloadImage(imageUrl, path, { label = imageUrl, log = console.log } = {}) {
  if (await exists(path)) return 'exists'
  const url = `${imageUrl.replace('http://', 'https://')}?width=${config.imageWidth}`
  for (let attempt = 0; attempt < config.downloadMaxAttempts; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': config.userAgent }, redirect: 'follow' })
    if (res.status === 429) {
      const wait = (Number(res.headers.get('retry-after')) || 5 * (attempt + 1)) * 1000
      log(`429 ${label}, waiting ${wait}ms`)
      await sleep(wait)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const ok = res.ok && detect(buf) && buf.length > 1000
    if (ok) {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, buf)
      log(`OK   ${label} ${buf.length}`)
    } else log(`FAIL ${label} ${res.status} ${res.headers.get('content-type')}`)
    await sleep(config.downloadDelayMs)
    return ok ? 'ok' : 'failed'
  }
  log(`FAIL ${label} (gave up after ${config.downloadMaxAttempts} attempts)`)
  return 'failed'
}

const strip = h => (h ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

// Commons file names -> Map(fileName -> { commonsFile, author, license }); files without metadata are omitted
export async function fetchAttributions(files) {
  const unique = [...new Set(files)]
  const out = new Map()
  for (let i = 0; i < unique.length; i += 50) { // API allows 50 titles per request
    const batch = unique.slice(i, i + 50)
    const u = new URL('https://commons.wikimedia.org/w/api.php')
    u.search = new URLSearchParams({
      action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'extmetadata',
      titles: batch.map(f => `File:${f}`).join('|'),
    })
    const res = await fetch(u, { headers: { 'User-Agent': config.userAgent } })
    if (!res.ok) throw new Error(`Commons API ${res.status}`)
    const json = await res.json()
    const byTitle = new Map(Object.values(json.query?.pages ?? {}).map(p => [p.title.replace(/^File:/, ''), p.imageinfo?.[0]?.extmetadata]))
    for (const f of batch) {
      const m = byTitle.get(f)
      if (m && Object.keys(m).length)
        out.set(f, { commonsFile: f, author: strip(m.Artist?.value) || 'unknown', license: m.LicenseShortName?.value ?? 'unknown' })
    }
  }
  return out
}
