// Standard shape every example must export (default export of examples/<id>/index.js).
import { z } from 'zod'

const qid = z.string().regex(/^Q\d+$/, 'expected a Wikidata QID like Q42')
const fn = z.custom(v => typeof v === 'function', 'expected a function')

export const AttributionSchema = z.object({
  commonsFile: z.string(),
  author: z.string(),
  license: z.string(),
})

export const EntitySchema = z.object({
  qid,
  label: z.string().min(1),
  imageUrl: z.url(),                                   // remote Commons Special:FilePath URL
  imageFile: z.string().min(1).refine(p => !p.startsWith('/') && !p.includes('..'), 'must be relative to the example folder'),
  role: z.enum(['gold', 'distractor']),
  extra: z.record(z.string(), z.unknown()).default({}), // example-specific fields (e.g. answer)
  attribution: AttributionSchema.optional(),            // filled in by the shared build step
})

export const QueryImageSchema = z.object({
  file: z.string().min(1),                              // relative to the example folder
  goldQid: qid,                                         // entity the query image depicts
  imageUrl: z.url().optional(),                         // Commons URL, used for attribution
  attribution: AttributionSchema.optional(),
})

export const MetaSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/, 'lowercase letters, digits, _ and - only'),
  name: z.string().min(1),
  description: z.string().min(1),
  question: z.string().min(1),
  goldQuery: z.string().min(1),                         // SPARQL for the gold entity
  goldEntity: qid,
  queryImage: QueryImageSchema,
  imageCount: z.number().int().positive().optional(),   // default number of distractor entities
})

export const ExampleSchema = z.object({
  meta: MetaSchema,
  entities: fn, // async (ctx: { config, imageCount, writeDist(name, data) }) => Entity[]
})

// Cached build output: examples/<id>/dist/entities.json
export const BuiltSchema = z.object({
  entities: z.array(EntitySchema).min(1),
  queryImage: QueryImageSchema,
})
