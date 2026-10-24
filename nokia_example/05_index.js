import { readFile, readdir } from 'node:fs/promises'
import { getEmbedder } from '../embeddings/index.js'
import { collectionName, recreateCollection, upsert } from '../vector_index/qdrant.js'

const here = p => new URL(p, import.meta.url)
const items = JSON.parse(await readFile(here('./dataset.json')))
// Gold example from step 1/2 (Nokia 3310, preferred P18 image)
items.unshift({
  phone: 'Q219691', phoneLabel: 'Nokia 3310', manufacturer: 'Q1418', manufacturerLabel: 'Nokia', answer: 1865,
  question: "In which year was this phone's manufacturer founded?",
  file: 'images/Q219691_Nokia_3310_Blue_R7309170_(retouch).png',
})

const onDisk = await readdir(here('./images'))
const present = []
for (const it of items) {
  const f = it.file ?? onDisk.map(n => 'images/' + n).find(n => n.startsWith('images/' + it.phone + '_'))
  if (f) present.push({ ...it, file: f })
}
console.log(`${present.length}/${items.length} entities have a local image`)

const embedder = await getEmbedder()
const name = collectionName('nokia_example', embedder)
const vectors = await embedder.embedImages(present.map(it => decodeURIComponent(here(`./${it.file}`).pathname)))
await recreateCollection(name, embedder.dim)
await upsert(name, present.map((it, i) => ({
  id: Number(it.phone.slice(1)),           // Wikidata Q-number as point id
  vector: vectors[i],
  payload: { qid: it.phone, label: it.phoneLabel, image: it.file },
})))
console.log(`indexed ${present.length} points into "${name}" using ${embedder.name}`)
