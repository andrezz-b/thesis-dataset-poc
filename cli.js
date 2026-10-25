// Usage: node cli.js <command> [example...|--all] [--refresh] [--k N]
//   list | build | index | e2e | docs | all
//   query <example> <image> [--k N]
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { listExampleIds, loadExample, loadExamples } from './lib/registry.js'
import { build, index, query, e2e, formatHits } from './lib/runner.js'
import { docs } from './lib/docs.js'
import { config } from './config.js'

const { positionals: [cmd, ...rest], values } = parseArgs({
  allowPositionals: true,
  options: { all: { type: 'boolean' }, refresh: { type: 'boolean' }, k: { type: 'string' } },
})
const k = values.k ? Number(values.k) : config.topK
const usage = 'usage: node cli.js <list|build|index|query|e2e|docs|all> [example...|--all] [--refresh] [--k N]'

async function selected() {
  if (values.all) return loadExamples()
  if (!rest.length) throw new Error(`${usage}\nspecify an example (${(await listExampleIds()).join(', ')}) or --all`)
  return loadExamples(rest)
}

try {
  switch (cmd) {
    case 'list':
      for (const ex of await loadExamples()) console.log(`${ex.meta.id}\t${ex.meta.name}`)
      break
    case 'build': for (const ex of await selected()) await build(ex, { refresh: values.refresh }); break
    case 'index': for (const ex of await selected()) await index(ex); break
    case 'e2e': for (const ex of await selected()) await e2e(ex, k); break
    case 'docs': await docs(await loadExamples()); break // always covers every example
    case 'all':
      for (const ex of await selected()) { await build(ex, { refresh: values.refresh }); await index(ex); await e2e(ex, k) }
      await docs(await loadExamples())
      break
    case 'query': {
      const [id, image] = rest
      if (!id || !image) throw new Error('usage: node cli.js query <example> <image> [--k N]')
      console.log(formatHits(await query(await loadExample(id), resolve(image), k), image))
      break
    }
    default: throw new Error(usage)
  }
} catch (e) {
  console.error(e.message)
  process.exitCode = 1
}
