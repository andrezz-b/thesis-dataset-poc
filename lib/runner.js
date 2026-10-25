// Shared pipeline stages used by every example: build -> index -> query/e2e -> docs.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { config, imageCountFor } from '../config.js'
import { BuiltSchema } from './schema.js'
import { sparql, wbk } from './wikidata.js'
import { commonsFileName, downloadImage, exists, fetchAttributions } from './commons.js'
import { getEmbedder } from '../embeddings/index.js'
import { collectionName, recreateCollection, search, upsert } from '../vector_index/qdrant.js'

const writeJson = (path, data) => writeFile(path, JSON.stringify(data, null, 2) + '\n')
const builtPath = ex => join(ex.dist, 'entities.json')

export async function readBuilt(ex) {
  if (!(await exists(builtPath(ex)))) throw new Error(`${ex.meta.id}: no dist/entities.json, run "node cli.js build ${ex.meta.id}" first`)
  const parsed = BuiltSchema.safeParse(JSON.parse(await readFile(builtPath(ex))))
  if (!parsed.success) throw new Error(`${ex.meta.id}: dist/entities.json is invalid (${z.prettifyError(parsed.error)}); rerun build --refresh`)
  return parsed.data
}

export async function build(ex, { refresh = false } = {}) {
  const { meta } = ex
  await mkdir(ex.dist, { recursive: true })
  const ctx = {
    config,
    imageCount: imageCountFor(meta),
    writeDist: (name, data) => writeJson(join(ex.dist, name), data),
  }

  let built
  if (!refresh && await exists(builtPath(ex))) built = await readBuilt(ex)
  else {
    const entities = await ex.entities(ctx)
    if (!entities.some(e => e.qid === meta.goldEntity && e.role === 'gold')) throw new Error(`${meta.id}: entities() must include the gold entity ${meta.goldEntity} with role "gold"`)
    built = BuiltSchema.parse({ entities, queryImage: meta.queryImage })
    console.log(`${meta.id}: ${entities.length} entities (${ctx.imageCount} requested distractors)`)
  }

  // gold query, run live as a sanity check
  const gold = await sparql(meta.goldQuery)
  await writeJson(join(ex.dist, 'gold_result.json'), gold)
  console.log(`${meta.id}: gold query ->`, JSON.stringify(wbk.simplify.sparqlResults(gold)))

  // images (resumable)
  let present = 0
  const images = [...built.entities.map(e => ({ file: e.imageFile, url: e.imageUrl, label: `${e.qid} ${e.label}` }))]
  for (const im of images) {
    const status = await downloadImage(im.url, join(ex.dir, im.file), { label: im.label })
    if (status !== 'failed') present++
  }
  console.log(`${meta.id}: ${present}/${images.length} entity images present`)
  const q = built.queryImage
  if (!(await exists(join(ex.dir, q.file)))) {
    if (q.imageUrl) await downloadImage(q.imageUrl, join(ex.dir, q.file), { label: 'query image' })
    else throw new Error(`${meta.id}: query image ${q.file} is missing and meta.queryImage.imageUrl is not set`)
  }

  // Commons author/licence for every image that does not have it yet
  const targets = [...built.entities, built.queryImage].filter(t => t.imageUrl && !t.attribution)
  if (targets.length) {
    const found = await fetchAttributions(targets.map(t => commonsFileName(t.imageUrl)))
    for (const t of targets) t.attribution = found.get(commonsFileName(t.imageUrl)) ?? t.attribution
  }
  await writeJson(builtPath(ex), built)
  console.log(`${meta.id}: wrote dist/entities.json`)
}

export async function index(ex) {
  const { entities } = await readBuilt(ex)
  const present = []
  for (const e of entities) if (await exists(join(ex.dir, e.imageFile))) present.push(e)
  console.log(`${ex.meta.id}: ${present.length}/${entities.length} entities have a local image`)
  const embedder = await getEmbedder()
  const name = collectionName(ex.meta.id, embedder)
  const vectors = await embedder.embedImages(present.map(e => join(ex.dir, e.imageFile)))
  await recreateCollection(name, embedder.dim)
  await upsert(name, present.map((e, i) => ({
    id: Number(e.qid.slice(1)), // Wikidata Q-number as point id
    vector: vectors[i],
    payload: { qid: e.qid, label: e.label, image: e.imageFile },
  })))
  console.log(`${ex.meta.id}: indexed ${present.length} points into "${name}" using ${embedder.name}`)
}

export async function query(ex, imagePath, k = config.topK) {
  const embedder = await getEmbedder()
  const [vec] = await embedder.embedImages([imagePath])
  const hits = await search(collectionName(ex.meta.id, embedder), vec, k)
  return { embedder: embedder.name, hits: hits.map(h => ({ ...h.payload, score: h.score })) }
}

export function formatHits({ embedder, hits }, imagePath) {
  return [`Query: ${imagePath}  (embedder: ${embedder})`, '',
    ...hits.map((h, i) => `${i + 1}. ${h.label} (${h.qid})  score=${h.score.toFixed(4)}`)].join('\n')
}

export async function e2e(ex, k = config.topK) {
  const { entities, queryImage } = await readBuilt(ex)
  const result = await query(ex, join(ex.dir, queryImage.file), k)
  const out = { queryImage: queryImage.file, goldQid: queryImage.goldQid, k, indexed: entities.length, ...result }
  await writeJson(join(ex.dist, 'e2e.json'), out)
  console.log(formatHits(result, queryImage.file))
  return out
}
