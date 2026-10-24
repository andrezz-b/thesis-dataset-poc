// Collects author + licence for every image from the Commons API -> ATTRIBUTION.md
import { readFile, writeFile } from 'node:fs/promises'
import { UA } from './lib.js'

const items = JSON.parse(await readFile(new URL('./dataset.json', import.meta.url)))
const files = [
  ...items.map(i => ({ qid: i.phone, label: i.phoneLabel, name: decodeURIComponent(i.image.split('/').pop()) })),
  { qid: 'Q219691', label: 'Nokia 3310 (index)', name: 'Nokia 3310 Blue R7309170 (retouch).png' },
  { qid: 'Q219691', label: 'Nokia 3310 (query image)', name: 'Nokia 3310 blue.jpg' },
]
const strip = h => (h ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const u = new URL('https://commons.wikimedia.org/w/api.php')
u.search = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'extmetadata',
  titles: files.map(f => 'File:' + f.name.replace(/_/g, ' ')).join('|') }) // one batched request (max 50 titles)
const res = await fetch(u, { headers: { 'User-Agent': UA } })
const pages = Object.values((await res.json()).query.pages)
const meta = new Map(pages.map(p => [p.title.replace(/^File:/, ''), p.imageinfo?.[0]?.extmetadata ?? {}]))
const rows = files.map(f => {
  const m = meta.get(f.name.replace(/_/g, ' ')) ?? {}
  return `| ${f.label} (${f.qid}) | [${f.name}](https://commons.wikimedia.org/wiki/File:${encodeURIComponent(f.name.replace(/ /g, '_'))}) | ${strip(m.Artist?.value) || 'unknown'} | ${m.LicenseShortName?.value ?? 'unknown'} |`
})
await writeFile(new URL('./ATTRIBUTION.md', import.meta.url),
  `# Image attribution\n\nAll images are from Wikimedia Commons (via Wikidata P18), downscaled to 512px width. Each keeps its own licence.\n\n| Entity | Commons file | Author | Licence |\n|---|---|---|---|\n${rows.join('\n')}\n`)
