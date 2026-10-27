import { expandDevices } from './src/expand.js'
import { fetchGold, goldQuery, GOLD_QID } from './src/gold.js'

export default {
  meta: {
    id: 'game-boy',
    name: 'Game Boy Founder Birth Year Example',
    description: 'Determine the device entity from a photo of an electronic device model, then follow '
      + '`manufacturer (P176) → founded by (P112) → date of birth (P569)` in Wikidata to answer in which year '
      + 'the founder of the console\'s manufacturer was born.',
    question: "In which year was the founder of this console's manufacturer born?",
    goldQuery,
    goldEntity: GOLD_QID,
    queryImage: {
      file: 'query/game_boy_original.jpg', // different Commons image than the indexed P18 (Game-Boy-FL.jpg)
      goldQid: GOLD_QID,
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Game-Boy-Original.jpg',
    },
  },

  async entities(ctx) {
    const gold = await fetchGold()
    const distractors = await expandDevices({ limit: ctx.imageCount, exclude: [GOLD_QID], writeDist: ctx.writeDist })
    return [gold, ...distractors]
  },
}
