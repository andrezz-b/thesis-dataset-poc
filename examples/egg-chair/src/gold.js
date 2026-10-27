import { commonsFileUrl, getEntities, preferredImage, sparql } from '../../../lib/wikidata.js'
import { imageFileFor } from '../../../lib/commons.js'

export const GOLD_QID = 'Q1301042' // Egg chair (en label "Egg")

export const goldQuery = `
SELECT ?designer ?designerLabel ?birth ?birthYear WHERE {
  BIND(wd:${GOLD_QID} AS ?chair)
  ?chair wdt:P287 ?designer .
  ?designer wdt:P569 ?birth .
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
      designer: b.designer.value.split('/').pop(),
      designerLabel: b.designerLabel.value,
      answer: Number(b.birthYear.value),
    },
  }
}
