import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ExampleSchema, EntitySchema } from './schema.js'
import { z } from 'zod'

export const root = new URL('../', import.meta.url).pathname
const examplesDir = join(root, 'examples')

export async function listExampleIds() {
  const dirs = await readdir(examplesDir, { withFileTypes: true })
  return dirs.filter(d => d.isDirectory() && !/^[_.]/.test(d.name)).map(d => d.name).sort()
}

export async function loadExample(id) {
  const dir = join(examplesDir, id)
  const mod = await import(pathToFileURL(join(dir, 'index.js')))
  const parsed = ExampleSchema.safeParse(mod.default)
  if (!parsed.success) throw new Error(`Example "${id}" has an invalid export:\n${z.prettifyError(parsed.error)}`)
  const { meta, entities } = parsed.data
  if (meta.id !== id) throw new Error(`Example folder "${id}" has meta.id "${meta.id}"; they must match`)
  const validated = async ctx => {
    const out = EntitySchema.array().safeParse(await entities(ctx))
    if (!out.success) throw new Error(`Example "${id}" returned invalid entities:\n${z.prettifyError(out.error)}`)
    return out.data
  }
  return { meta, entities: validated, dir, dist: join(dir, 'dist') }
}

export async function loadExamples(ids) {
  return Promise.all((ids?.length ? ids : await listExampleIds()).map(loadExample))
}
