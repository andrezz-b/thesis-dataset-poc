import { commonsFileUrl, getEntities, preferredImage, sparql } from '../../../lib/wikidata.js'
import { imageFileFor } from '../../../lib/commons.js'

export const GOLD_QID = 'Q186437' // Game Boy

export const goldQuery = `
SELECT ?manufacturer ?manufacturerLabel ?founder ?founderLabel ?birth ?birthYear WHERE {
  BIND(wd:${GOLD_QID} AS ?product)
  ?product wdt:P176 ?manufacturer .
  ?manufacturer wdt:P112 ?founder .
  ?founder wdt:P569 ?birth .
  BIND(YEAR(?birth) AS ?birthYear)
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
      founder: b.founder.value.split('/').pop(),
      founderLabel: b.founderLabel.value,
      answer: Number(b.birthYear.value),
    },
  }
}
