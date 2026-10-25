import { expandPhones } from './src/expand.js'
import { fetchGold, goldQuery, GOLD_QID } from './src/gold.js'

export default {
  meta: {
    id: 'nokia',
    name: 'Nokia Manufacturer Inception Example',
    description: 'Determine the phone entity from a photo of a cell phone model, then follow `manufacturer (P176) → inception (P571)` '
      + 'in Wikidata to answer in which year the phone\'s manufacturer was founded.',
    question: "In which year was this phone's manufacturer founded?",
    goldQuery,
    goldEntity: GOLD_QID,
    queryImage: {
      file: 'query/nokia_3310_blue.jpg', // non-preferred P18 image of the 3310, so the match is not trivial
      goldQid: GOLD_QID,
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nokia%203310%20blue.jpg',
    },
  },

  async entities(ctx) {
    const gold = await fetchGold()
    const distractors = await expandPhones({ limit: ctx.imageCount, exclude: [GOLD_QID], writeDist: ctx.writeDist })
    return [gold, ...distractors]
  },
}
