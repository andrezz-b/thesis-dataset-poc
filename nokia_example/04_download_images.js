import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { UA } from './lib.js'

const WIDTH = 512 // Commons renders a thumbnail; plenty for embedding models
const dataset = new URL('./dataset.json', import.meta.url)
const items = JSON.parse(await readFile(dataset))
await mkdir(new URL('./images', import.meta.url), { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const detect = b => b.subarray(0,3).toString('hex')==='ffd8ff' ? 'jpg' : b.subarray(1,4).toString()==='PNG' ? 'png'
  : b.subarray(0,4).toString()==='RIFF' ? 'webp' : b.subarray(0,3).toString()==='GIF' ? 'gif' : null

let ok = 0
for (const it of items) {
  const name = decodeURIComponent(it.image.split('/').pop()).replace(/\s+/g, '_').replace(/[^\w.()-]/g, '_')
  const file = `images/${it.phone}_${name}`
  const path = new URL(`./${file}`, import.meta.url)
  const exists = await access(path).then(() => true, () => false)
  if (exists) { it.file = file; ok++; continue }
  const url = it.image.replace('http://', 'https://') + `?width=${WIDTH}`
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
    if (res.status === 429) {
      const wait = (Number(res.headers.get('retry-after')) || 5 * (attempt + 1)) * 1000
      console.log(`429 ${it.phone}, waiting ${wait}ms`); await sleep(wait); continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const kind = detect(buf)
    if (res.ok && kind && buf.length > 1000) {
      await writeFile(path, buf); Object.assign(it, { file, bytes: buf.length, format: kind }); ok++
      console.log('OK  ', it.phone, it.phoneLabel, buf.length)
    } else console.log('FAIL', it.phone, it.phoneLabel, res.status, res.headers.get('content-type'))
    break
  }
  await sleep(1500)
}
await writeFile(dataset, JSON.stringify(items, null, 2))
console.log(`${ok}/${items.length} images present`)
