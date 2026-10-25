# `src/gold.js` template (from examples/nokia/src/gold.js)

Replace `<...>`. Hop fields in `extra` follow the path: one `<hop>`/`<hop>Label` pair per entity hop, then `answer`.

```js
import { commonsFileUrl, getEntities, preferredImage, sparql } from '../../../lib/wikidata.js'
import { imageFileFor } from '../../../lib/commons.js'

export const GOLD_QID = '<QID>' // <label>

export const goldQuery = `
SELECT ?<hop1> ?<hop1>Label ?<value> ?<answerVar> WHERE {
  BIND(wd:${GOLD_QID} AS ?item)
  ?item wdt:<P1> ?<hop1> .
  ?<hop1> wdt:<P2> ?<value> .
  BIND(YEAR(?<value>) AS ?<answerVar>)      # only for date -> year; otherwise bind/select the value directly
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
      <hop1>: b.<hop1>.value.split('/').pop(),   // entity hop: QID ...
      <hop1>Label: b.<hop1>Label.value,           // ... and label
      answer: Number(b.<answerVar>.value),        // Number for years/quantities, string/QID otherwise
    },
  }
}
```

Multi-hop (A → B → C → answer): chain the triple patterns in `goldQuery`, select every intermediate and its label, and
add one `<hop>`/`<hop>Label` pair per intermediate to `extra`. If the query returns 0 or >1 bindings, stop and report
(ambiguity), do not take `bindings[0]` blindly.
