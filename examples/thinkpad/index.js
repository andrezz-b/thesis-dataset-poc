import { expandLaptops } from './src/expand.js'
import { fetchGold, goldQuery, GOLD_QID } from './src/gold.js'

export default {
  meta: {
    id: 'thinkpad',
    name: 'IBM ThinkPad Manufacturer Inception Example',
    description: 'Determine the laptop entity from a photo of a laptop model, then follow `manufacturer (P176) → inception (P571)` '
      + 'in Wikidata to answer in which year the laptop\'s manufacturer was established.',
    question: 'In which year was the manufacturer of this laptop established?',
    goldQuery,
    goldEntity: GOLD_QID,
    queryImage: {
      file: 'query/thinkpad_701_butterfly.jpg', // the 701 has a single P18 image, so another Commons photo is used as query
      goldQid: GOLD_QID,
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/IBM%20ThinkPad%20701%20Butterfly%2005.JPG',
    },
  },

  async entities(ctx) {
    const gold = await fetchGold()
    const distractors = await expandLaptops({ limit: ctx.imageCount, exclude: [GOLD_QID], writeDist: ctx.writeDist })
    return [gold, ...distractors]
  },
}
