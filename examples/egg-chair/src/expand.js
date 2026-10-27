import { sparql } from '../../../lib/wikidata.js'
import { imageFileFor } from '../../../lib/commons.js'

const query = `
SELECT ?chair ?chairLabel ?image ?designer ?designerLabel ?birthYear WHERE {
  ?chair wdt:P279 wd:Q15026 ;   # subclass of chair
         wdt:P18 ?image ;
         wdt:P287 ?designer .
  ?designer wdt:P569 ?birth .
  BIND(YEAR(?birth) AS ?birthYear)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?chair
LIMIT 1000`

// Chairs with an unambiguous answer (one designer/birth date, one image) and a real label, first `limit` by QID
export async function expandChairs({ limit, exclude = [], writeDist }) {
  const data = await sparql(query)
  await writeDist('chairs_raw.json', data)

  const byChair = new Map()
  for (const b of data.results.bindings) {
    const qid = b.chair.value.split('/').pop()
    const e = byChair.get(qid) ?? { qid, label: b.chairLabel.value, images: new Set(), answers: new Set() }
    e.images.add(b.image.value)
    e.answers.add(`${b.designer.value.split('/').pop()}|${b.designerLabel.value}|${b.birthYear.value}`)
    byChair.set(qid, e)
  }
  const items = [...byChair.values()]
    .filter(e => e.answers.size === 1 && e.images.size === 1 && !/^Q\d+$/.test(e.label) && !exclude.includes(e.qid))
    .slice(0, limit)
    .map(e => {
      const [designer, designerLabel, year] = [...e.answers][0].split('|')
      const imageUrl = [...e.images][0]
      return {
        qid: e.qid, label: e.label, imageUrl, imageFile: imageFileFor(e.qid, imageUrl), role: 'distractor',
        extra: { designer, designerLabel, answer: Number(year) },
      }
    })
  console.log('raw rows', data.results.bindings.length, 'chairs', byChair.size, 'selected', items.length)
  return items
}
