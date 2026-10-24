import { wbk, UA } from './lib.js'
import { mkdir, writeFile } from 'node:fs/promises'

const res = await fetch(wbk.getEntities({ ids: ['Q219691'], props: ['claims'] }), { headers: { 'User-Agent': UA } })
const entity = Object.values((await res.json()).entities)[0]
const claims = wbk.simplify.claims(entity.claims, { keepRanks: true })
const images = claims.P18
console.log(images)
const best = images.find(c => c.rank === 'preferred') ?? images[0]
const file = best.value
const url = wbk.getImageUrl(file, 512) // 512px thumbnail
console.log('Using', file, url)
const img = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
if (!img.ok) throw new Error(img.status)
await mkdir(new URL('./images', import.meta.url), { recursive: true })
const buf = Buffer.from(await img.arrayBuffer())
await writeFile(new URL(`./images/Q219691_${file.replace(/\s+/g, '_')}`, import.meta.url), buf)
console.log('bytes', buf.length, img.headers.get('content-type'))
