import { sparql } from '../../../lib/wikidata.js'
import { imageFileFor } from '../../../lib/commons.js'

const query = `
SELECT ?phone ?phoneLabel ?image ?manufacturer ?manufacturerLabel ?inceptionYear WHERE {
  ?phone wdt:P31 wd:Q19723444 ;   # cell phone model
         wdt:P18 ?image ;
         wdt:P176 ?manufacturer .
  ?manufacturer wdt:P571 ?inception .
  BIND(YEAR(?inception) AS ?inceptionYear)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?phone
LIMIT 1000`

// Phones with an unambiguous answer (one manufacturer/inception, one image) and a real label, first `limit` by QID
export async function expandPhones({ limit, exclude = [], writeDist }) {
  const data = await sparql(query)
  await writeDist('phones_raw.json', data)

  const byPhone = new Map()
  for (const b of data.results.bindings) {
    const qid = b.phone.value.split('/').pop()
    const e = byPhone.get(qid) ?? { qid, label: b.phoneLabel.value, images: new Set(), answers: new Set() }
    e.images.add(b.image.value)
    e.answers.add(`${b.manufacturer.value.split('/').pop()}|${b.manufacturerLabel.value}|${b.inceptionYear.value}`)
    byPhone.set(qid, e)
  }
  const items = [...byPhone.values()]
    .filter(e => e.answers.size === 1 && e.images.size === 1 && !/^Q\d+$/.test(e.label) && !exclude.includes(e.qid))
    .slice(0, limit)
    .map(e => {
      const [manufacturer, manufacturerLabel, year] = [...e.answers][0].split('|')
      const imageUrl = [...e.images][0]
      return {
        qid: e.qid, label: e.label, imageUrl, imageFile: imageFileFor(e.qid, imageUrl), role: 'distractor',
        extra: { manufacturer, manufacturerLabel, answer: Number(year) },
      }
    })
  console.log('raw rows', data.results.bindings.length, 'phones', byPhone.size, 'selected', items.length)
  return items
}
