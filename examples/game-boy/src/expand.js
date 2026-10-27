import { sparql } from '../../../lib/wikidata.js'
import { imageFileFor } from '../../../lib/commons.js'

const query = `
SELECT ?device ?deviceLabel ?image ?manufacturer ?manufacturerLabel ?founder ?founderLabel ?birthYear WHERE {
  ?device wdt:P31 wd:Q62008942 ;   # electronic device model (same class as the gold)
          wdt:P18 ?image ;
          wdt:P176 ?manufacturer .
  ?manufacturer wdt:P112 ?founder .
  ?founder wdt:P569 ?birth .
  BIND(YEAR(?birth) AS ?birthYear)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY ?device
LIMIT 1000`

// Devices with an unambiguous answer (one manufacturer/founder/birth year, one image) and a real label, first `limit` by QID
export async function expandDevices({ limit, exclude = [], writeDist }) {
  const data = await sparql(query)
  await writeDist('devices_raw.json', data)

  const byDevice = new Map()
  for (const b of data.results.bindings) {
    const qid = b.device.value.split('/').pop()
    const e = byDevice.get(qid) ?? { qid, label: b.deviceLabel.value, images: new Set(), answers: new Set() }
    e.images.add(b.image.value)
    e.answers.add([b.manufacturer, b.manufacturerLabel, b.founder, b.founderLabel, b.birthYear].map(x => x.value.split('/').pop()).join('|'))
    byDevice.set(qid, e)
  }
  const items = [...byDevice.values()]
    .filter(e => e.answers.size === 1 && e.images.size === 1 && !/^Q\d+$/.test(e.label) && !exclude.includes(e.qid))
    .slice(0, limit)
    .map(e => {
      const [manufacturer, manufacturerLabel, founder, founderLabel, year] = [...e.answers][0].split('|')
      const imageUrl = [...e.images][0]
      return {
        qid: e.qid, label: e.label, imageUrl, imageFile: imageFileFor(e.qid, imageUrl), role: 'distractor',
        extra: { manufacturer, manufacturerLabel, founder, founderLabel, answer: Number(year) },
      }
    })
  console.log('raw rows', data.results.bindings.length, 'devices', byDevice.size, 'selected', items.length)
  return items
}
