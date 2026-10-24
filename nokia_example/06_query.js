// Usage: node 06_query.js <image path> [topK] [--md]
import { getEmbedder } from '../embeddings/index.js'
import { collectionName, search } from '../vector_index/qdrant.js'
import { resolve } from 'node:path'

const md = process.argv.includes('--md')
const [imagePath, k = '5'] = process.argv.slice(2).filter(a => a !== '--md')
if (!imagePath) throw new Error('usage: node 06_query.js <image> [topK] [--md]')
const embedder = await getEmbedder()
const [vec] = await embedder.embedImages([resolve(imagePath)])
const hits = await search(collectionName('nokia_example', embedder), vec, Number(k))
const wd = id => `https://www.wikidata.org/wiki/${id}`

if (md) {
  console.log(`**Query image** (\`${imagePath}\`):\n\n<img src="${imagePath}" height="200">\n`)
  console.log('| # | Image | Entity | Score | Manufacturer | Founded |\n|---|---|---|---|---|---|')
  hits.forEach((h, i) => {
    const p = h.payload
    console.log(`| ${i + 1} | <img src="${encodeURI(p.image)}" height="100"> | **${p.label}** ([${p.qid}](${wd(p.qid)})) | ${h.score.toFixed(4)} | ${p.manufacturerLabel} ([${p.manufacturer}](${wd(p.manufacturer)})) | ${p.inceptionYear} |`)
  })
} else {
  console.log(`Query: ${imagePath}  (embedder: ${embedder.name})\n`)
  hits.forEach((h, i) => {
    const p = h.payload
    console.log(`${i + 1}. ${p.label} (${p.qid})  score=${h.score.toFixed(4)}`)
    console.log(`   manufacturer: ${p.manufacturerLabel} (${p.manufacturer})  founded: ${p.inceptionYear}`)
  })
}
