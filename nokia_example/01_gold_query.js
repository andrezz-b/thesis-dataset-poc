import { WBK } from 'wikibase-sdk'
import { writeFile } from 'node:fs/promises'

const wbk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
})

const sparql = `
SELECT ?manufacturer ?manufacturerLabel ?inception ?inceptionYear WHERE {
  BIND(wd:Q219691 AS ?product)
  ?product wdt:P176 ?manufacturer .
  ?manufacturer wdt:P571 ?inception .
  BIND(YEAR(?inception) AS ?inceptionYear)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`

const url = wbk.sparqlQuery(sparql)
const res = await fetch(url, {
  headers: { 'User-Agent': 'VisualGraphQA-POC/1.0 (thesis proof of concept)', Accept: 'application/sparql-results+json' },
})
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
const data = await res.json()
await writeFile(new URL('./gold_query_result.json', import.meta.url), JSON.stringify(data, null, 2))
console.log(JSON.stringify(wbk.simplify.sparqlResults(data), null, 2))
console.log(JSON.stringify(data.results.bindings, null, 2))
