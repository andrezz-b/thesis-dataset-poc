import { commonsFileUrl, getEntities, preferredImage, sparql } from '../../../lib/wikidata.js'
import { imageFileFor } from '../../../lib/commons.js'

export const GOLD_QID = 'Q106942963' // IBM ThinkPad 701

export const goldQuery = `
SELECT ?manufacturer ?manufacturerLabel ?inception ?inceptionYear WHERE {
  BIND(wd:${GOLD_QID} AS ?product)
  ?product wdt:P176 ?manufacturer .
  ?manufacturer wdt:P571 ?inception .
  BIND(YEAR(?inception) AS ?inceptionYear)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`

// Gold entity: label and preferred-rank P18 image from the entity, answer from the gold query
export async function fetchGold() {
  const [data, entities] = await Promise.all([sparql(goldQuery), getEntities([GOLD_QID])])
  const entity = entities[GOLD_QID]
  const b = data.results.bindings[0]
  const imageUrl = commonsFileUrl(preferredImage(entity))
  return {
    qid: GOLD_QID,
    label: entity.labels.en.value,
    imageUrl,
    imageFile: imageFileFor(GOLD_QID, imageUrl),
    role: 'gold',
    extra: {
      manufacturer: b.manufacturer.value.split('/').pop(),
      manufacturerLabel: b.manufacturerLabel.value,
      answer: Number(b.inceptionYear.value),
    },
  }
}
