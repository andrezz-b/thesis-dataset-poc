// Thin Qdrant wrapper, reusable across examples. One collection per (example, embedder).
import { QdrantClient } from '@qdrant/js-client-rest'

export const client = new QdrantClient({ url: process.env.QDRANT_URL ?? 'http://localhost:6333' })

export const collectionName = (example, embedder) =>
  `${example}__${embedder.name.replace(/[^\w]+/g, '_')}`

export async function recreateCollection(name, dim) {
  if ((await client.getCollections()).collections.some(c => c.name === name)) await client.deleteCollection(name)
  await client.createCollection(name, { vectors: { size: dim, distance: 'Cosine' } })
}

// points: [{ id: number|uuid, vector: number[], payload: object }]
export async function upsert(name, points) {
  await client.upsert(name, { wait: true, points })
}

export async function search(name, vector, limit = 5) {
  const r = await client.query(name, { query: vector, limit, with_payload: true })
  return r.points
}
