import { sparql } from './lib.js'
import { writeFile } from 'node:fs/promises'

const q = `
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
const data = await sparql(q)
await writeFile(new URL('./phones_raw.json', import.meta.url), JSON.stringify(data, null, 2))

const byPhone = new Map()
for (const b of data.results.bindings) {
  const id = b.phone.value.split('/').pop()
  const e = byPhone.get(id) ?? { id, label: b.phoneLabel.value, images: new Set(), answers: new Set() }
  e.images.add(b.image.value)
  e.answers.add(`${b.manufacturer.value.split('/').pop()}|${b.manufacturerLabel.value}|${b.inceptionYear.value}`)
  byPhone.set(id, e)
}
// keep only phones with an unambiguous answer and a single image
const items = [...byPhone.values()]
  .filter(e => e.answers.size === 1 && e.images.size === 1 && !/^Q\d+$/.test(e.label))
  .slice(0, 25)
  .map(e => {
    const [mid, mlabel, year] = [...e.answers][0].split('|')
    return {
      phone: e.id, phoneLabel: e.label, image: [...e.images][0],
      manufacturer: mid, manufacturerLabel: mlabel, answer: Number(year),
      question: "In which year was this phone's manufacturer founded?",
    }
  })
console.log('raw rows', data.results.bindings.length, 'phones', byPhone.size, 'selected', items.length)
await writeFile(new URL('./dataset.json', import.meta.url), JSON.stringify(items, null, 2))
