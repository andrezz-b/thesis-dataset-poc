// Pluggable embedding providers. Select with EMBEDDER=<key> (default: clip-b32).
// A provider is: { name, dim, embedImages(paths): Promise<number[][]>, embedTexts(texts): Promise<number[][]> }
// Vectors must be L2-normalised so cosine == dot product.
// To add a model: create a file exporting a factory and register it below.
import { clipProvider } from './clip.js'

const providers = {
  'clip-b32': () => clipProvider('Xenova/clip-vit-base-patch32', 512),
  'clip-b16': () => clipProvider('Xenova/clip-vit-base-patch16', 512),
}

export async function getEmbedder(key = process.env.EMBEDDER ?? 'clip-b32') {
  const make = providers[key]
  if (!make) throw new Error(`Unknown EMBEDDER "${key}". Available: ${Object.keys(providers).join(', ')}`)
  return { key, ...(await make()) }
}
