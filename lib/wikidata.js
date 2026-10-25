import { WBK } from 'wikibase-sdk'
import { config } from '../config.js'

export const wbk = WBK({ instance: config.wbInstance, sparqlEndpoint: config.sparqlEndpoint })

export const entityUrl = id => `${config.wbInstance}/wiki/${id}`

async function getJson(url, accept = 'application/json') {
  const res = await fetch(url, { headers: { 'User-Agent': config.userAgent, Accept: accept } })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json()
}

export const sparql = query => getJson(wbk.sparqlQuery(query), 'application/sparql-results+json')

export async function getEntities(ids, props = ['labels', 'claims']) {
  return (await getJson(wbk.getEntities({ ids, props }))).entities
}

// File name of the preferred-rank (else first) P18 image, or undefined
export function preferredImage(entity) {
  const images = wbk.simplify.claims(entity.claims ?? {}, { keepRanks: true }).P18 ?? []
  return (images.find(c => c.rank === 'preferred') ?? images[0])?.value
}

// Special:FilePath URL for a Commons file name (full size; thumbnails are requested by the downloader)
export const commonsFileUrl = file => encodeURI(wbk.getImageUrl(file))
