import { expandChairs } from './src/expand.js'
import { fetchGold, goldQuery, GOLD_QID } from './src/gold.js'

export default {
  meta: {
    id: 'egg-chair',
    name: 'Egg Chair Designer Birth Year Example',
    description: 'Determine the chair entity from a photo of a chair, then follow `designed by (P287) → date of birth (P569)` '
      + 'in Wikidata to answer in which year the chair\'s designer was born.',
    question: 'In which year was the designer of this chair born?',
    goldQuery,
    goldEntity: GOLD_QID,
    queryImage: {
      file: 'query/egg_chair_1958.jpg', // the Egg chair has a single P18 image, so another Commons photo is used as query
      goldQid: GOLD_QID,
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Egg%20chair%20-%20Arne%20Jacobsen%20(1958).jpg',
    },
  },

  async entities(ctx) {
    const gold = await fetchGold()
    const distractors = await expandChairs({ limit: ctx.imageCount, exclude: [GOLD_QID], writeDist: ctx.writeDist })
    return [gold, ...distractors]
  },
}
