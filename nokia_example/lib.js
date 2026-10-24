import { WBK } from 'wikibase-sdk'
export const wbk = WBK({
  instance: 'https://www.wikidata.org',
  sparqlEndpoint: 'https://query.wikidata.org/sparql',
})
export const UA = 'VisualGraphQA-POC/1.0 (thesis proof of concept)'
export async function sparql(query) {
  const res = await fetch(wbk.sparqlQuery(query), { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
}
