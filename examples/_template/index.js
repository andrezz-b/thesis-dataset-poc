// Copy this folder to examples/<id>/ (folders starting with "_" are ignored by the CLI) and fill it in.
// Helpers live in ./src/. Shared helpers: lib/wikidata.js (sparql, getEntities, preferredImage, commonsFileUrl),
// lib/commons.js (imageFileFor). The runner downloads images, indexes, queries and generates docs/attribution.
// Also add a README.md containing the <!-- e2e:start --> / <!-- e2e:end --> markers (see examples/nokia/README.md),
// a query image under query/ and run `node cli.js all <id>`.
export default {
  meta: {
    id: 'template',                       // must equal the folder name
    name: 'Template Example',
    description: 'What the example tests, e.g. image -> entity -> property path.',
    question: 'Question asked about the entity in the image?',
    goldQuery: 'SELECT ...',              // SPARQL for the gold entity
    goldEntity: 'Q42',
    queryImage: {
      file: 'query/query.jpg',            // relative to the example folder
      goldQid: 'Q42',                     // entity the query image depicts
      imageUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Example.jpg', // optional, enables attribution/download
    },
    // imageCount: 25,                    // optional default; IMAGE_COUNT_<ID> env overrides
  },

  // Must return the gold entity (role 'gold') plus up to ctx.imageCount distractors:
  // { qid, label, imageUrl, imageFile, role: 'gold' | 'distractor', extra: { ...example specific fields } }
  async entities(ctx) {
    throw new Error('not implemented')
  },
}
