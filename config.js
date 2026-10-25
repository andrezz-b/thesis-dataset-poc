// Central configuration. Values come from env variables (set in the [env] section of mise.toml), otherwise defaults.
import { z } from 'zod'

const int = (def) => z.coerce.number().int().positive().default(def)

const env = z.object({
  WB_INSTANCE: z.string().default('https://www.wikidata.org'),
  SPARQL_ENDPOINT: z.string().default('https://query.wikidata.org/sparql'),
  USER_AGENT: z.string().default('VisualGraphQA-POC/1.0 (thesis proof of concept)'),
  IMAGE_COUNT: int(25),
  IMAGE_WIDTH: int(512),
  DOWNLOAD_DELAY_MS: z.coerce.number().int().nonnegative().default(1500),
  DOWNLOAD_MAX_ATTEMPTS: int(8),
  EMBEDDER: z.string().default('clip-b32'),
  QDRANT_URL: z.string().default('http://localhost:6333'),
  TOP_K: int(5),
}).parse(process.env)

export const config = Object.freeze({
  wbInstance: env.WB_INSTANCE,
  sparqlEndpoint: env.SPARQL_ENDPOINT,
  userAgent: env.USER_AGENT,
  imageCount: env.IMAGE_COUNT,
  imageWidth: env.IMAGE_WIDTH,
  downloadDelayMs: env.DOWNLOAD_DELAY_MS,
  downloadMaxAttempts: env.DOWNLOAD_MAX_ATTEMPTS,
  embedder: env.EMBEDDER,
  qdrantUrl: env.QDRANT_URL,
  topK: env.TOP_K,
})

// Precedence: IMAGE_COUNT_<ID> env > meta.imageCount > IMAGE_COUNT env/default
export function imageCountFor(meta) {
  const key = `IMAGE_COUNT_${meta.id.toUpperCase().replace(/\W+/g, '_')}`
  if (process.env[key] !== undefined) return int(config.imageCount).parse(process.env[key])
  return meta.imageCount ?? config.imageCount
}
