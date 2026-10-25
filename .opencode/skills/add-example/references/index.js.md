# `index.js` template (from examples/nokia/index.js)

```js
import { expandItems } from './src/expand.js'
import { fetchGold, goldQuery, GOLD_QID } from './src/gold.js'

export default {
  meta: {
    id: '<id>',                          // == folder name, [a-z0-9_-]+
    name: '<Human Readable Name>',
    description: '<What is determined from the image>, then follow `<hop label> (<P1>) → <hop label> (<P2>)` '
      + 'in Wikidata to answer <question in prose>.',
    question: '<Question shown to the user>?',
    goldQuery,
    goldEntity: GOLD_QID,
    queryImage: {
      file: 'query/<name>.jpg',          // a different image than the indexed P18, so the match is not trivial
      goldQid: GOLD_QID,
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/<File%20Name>.jpg', // omit if no Commons source
    },
    // imageCount: 25,                   // optional; IMAGE_COUNT_<ID> env overrides
  },

  async entities(ctx) {
    const gold = await fetchGold()
    const distractors = await expandItems({ limit: ctx.imageCount, exclude: [GOLD_QID], writeDist: ctx.writeDist })
    return [gold, ...distractors]
  },
}
```
