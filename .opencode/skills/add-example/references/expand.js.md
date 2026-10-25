# `src/expand.js` template (from examples/nokia/src/expand.js)

```js
import { sparql } from '../../../lib/wikidata.js'
import { imageFileFor } from '../../../lib/commons.js'

const query = `
SELECT ?item ?itemLabel ?image ?<hop1> ?<hop1>Label ?<answerVar> WHERE {
  ?item wdt:P31 wd:<CLASS> ;   # <class label> (verified with wd)
        wdt:P18 ?image ;
        wdt:<P1> ?<hop1> .
  ?<hop1> wdt:<P2> ?<value> .
  BIND(YEAR(?<value>) AS ?<answerVar>)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?item
LIMIT 1000`

// Entities with an unambiguous answer (one value per hop, one image) and a real label, first `limit` by QID
export async function expandItems({ limit, exclude = [], writeDist }) {
  const data = await sparql(query)
  await writeDist('items_raw.json', data)

  const byItem = new Map()
  for (const b of data.results.bindings) {
    const qid = b.item.value.split('/').pop()
    const e = byItem.get(qid) ?? { qid, label: b.itemLabel.value, images: new Set(), answers: new Set() }
    e.images.add(b.image.value)
    e.answers.add(`${b.<hop1>.value.split('/').pop()}|${b.<hop1>Label.value}|${b.<answerVar>.value}`)
    byItem.set(qid, e)
  }
  const items = [...byItem.values()]
    .filter(e => e.answers.size === 1 && e.images.size === 1 && !/^Q\d+$/.test(e.label) && !exclude.includes(e.qid))
    .slice(0, limit)
    .map(e => {
      const [<hop1>, <hop1>Label, answer] = [...e.answers][0].split('|')
      const imageUrl = [...e.images][0]
      return {
        qid: e.qid, label: e.label, imageUrl, imageFile: imageFileFor(e.qid, imageUrl), role: 'distractor',
        extra: { <hop1>, <hop1>Label, answer: Number(answer) }, // same shape as the gold entity
      }
    })
  console.log('raw rows', data.results.bindings.length, 'items', byItem.size, 'selected', items.length)
  return items
}
```

Notes
- The `|` join breaks if a label contains `|`; use `JSON.stringify([...])` as the set key if that is possible.
- Too few results after filtering (< `ctx.imageCount`)? Do not silently proceed: tell the user and suggest extensions
  (`wdt:P279*` superclass, sibling classes, same manufacturer/creator, lower `imageCount`).
- Deprecated/ranked claims: `wdt:` returns only best-rank values, which is what we want; mention it if relevant.
- `LIMIT 1000` plus `ORDER BY` keeps the selection deterministic; raise it only if needed for volume.
