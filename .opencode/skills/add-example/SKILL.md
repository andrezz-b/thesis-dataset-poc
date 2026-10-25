---
name: add-example
description: Add a new example (image QA over Wikidata) to this dataset PoC. Use when the user wants to create a new example under examples/<id>/ from a gold entity, a question and the expected answer. Covers wd sanity checks, query image, distractors, code structure, build/index/e2e and docs.
---

# Add a new example

An example = one gold entity (image) + a question answered by walking a Wikidata property path + distractor entities
of the same class. Reference implementation: `examples/nokia/` (Nokia 3310, `manufacturer P176 → inception P571` → 1865).
Read `AGENTS.md` first; its rules apply. Do **not** edit `examples/nokia/`, `lib/`, `embeddings/` or `vector_index/`
(they stay example-agnostic); everything new goes in `examples/<id>/`.

## 1. Intake (ask for anything missing)

Required from the user:
- **Gold entity**: QID (or a name you resolve with `wd`, then confirm the QID with the user).
- **Question**: natural language, e.g. "In which year was this phone's manufacturer founded?".
- **Goal / answer**: the property path (e.g. `P176 → P571`) and the expected answer (e.g. 1865).
- Optional: their own SPARQL, a query image, a preferred example `id`.

Pick `id` = lowercase `[a-z0-9_-]+`, equal to the folder name. Confirm it with the user.

## 2. Sanity checks with the `wd` CLI (before writing any code)

`wd` is configured in `mise.toml` (use `mise exec -- wd ...` if it is not on PATH). Never rely on memory for QIDs/PIDs.

```bash
wd label Q219691                       # right entity?
wd claims Q219691 P31                  # class(es) -> needed for distractors; verify the class QID/label
wd claims Q219691 P18                  # images; check count and ranks
wd claims Q219691 P176                 # each hop of the path
wd claims Q1418 P571                   # final hop; inspect value precision/ranks
wd sparql query.rq                     # run the user's SPARQL (or your gold query) from a file
wd props P176 && wd label P176         # confirm property meaning
```
(`wd claims <id> <pid>` output varies by version; add `--json` if you need ranks/qualifiers.)

Verify, and report to the user:
- Entity label/class are what the user expects.
- Every hop has **exactly one** non-deprecated value (or one preferred-rank value). Multiple values, deprecated
  claims, missing hops, or date precision coarser than needed are **ambiguities: STOP and ask the user** how to proceed
  (choose another gold entity, accept a value, change the question). Do not silently pick.
- The computed answer equals the user's expected answer. If not, STOP and show the difference.
- If the user supplied SPARQL, run it and compare its result with the expected answer; show any discrepancy.

## 3. Query image

Following Nokia: index the gold entity's **preferred-rank (else first) P18**, and use a *different* image as the query
image, so the match is not trivial.
- `wd claims <QID> P18` to list images. Choose a non-indexed one (or another Commons file clearly depicting the entity).
- Download into `examples/<id>/query/<name>.jpg` (512px: `https://commons.wikimedia.org/wiki/Special:FilePath/<File>?width=512`,
  with a descriptive `User-Agent`, e.g. `curl -L -A "$USER_AGENT" -o ...`). Verify it is really an image.
- Set `meta.queryImage.imageUrl` to the Commons `Special:FilePath` URL so attribution works.
- If there is no suitable second image, **ask the user to provide one** (file path). Use `queryImage.file` only
  (no `imageUrl`) if it has no Commons source.

## 4. Distractors (same class as the gold)

Distractors share the gold's `P31` class, have the path populated, exactly one image and one unambiguous answer.
Verify the class and count candidates with a `wd sparql` first:

```sparql
SELECT (COUNT(DISTINCT ?x) AS ?n) WHERE { ?x wdt:P31 wd:<CLASS> ; wdt:P18 ?i ; wdt:<HOP1> ?h . ?h wdt:<HOP2> ?v }
```
Need at least `IMAGE_COUNT` (default 25, `IMAGE_COUNT_<ID>` env or `meta.imageCount` overrides) *after* the JS ambiguity filter.
If there are too few, **tell the user** the count and suggest extensions, then let them choose:
- superclass via `wdt:P279*` / `wdt:P31/wdt:P279*` (verify the class tree with `wd`),
- sibling classes under the same parent,
- same manufacturer/creator/country/etc. instead of the same class,
- lowering `IMAGE_COUNT` / `meta.imageCount`.

## 5. Code structure

```
examples/<id>/
  index.js        default export { meta, entities(ctx) }   (zod-validated by lib/schema.js)
  src/gold.js     GOLD_QID, goldQuery, fetchGold()
  src/expand.js   SPARQL + JS filtering -> distractor entities
  query/          committed query image
  images/         downloaded by `build` (512px thumbnails, <QID>_<file>), committed
  README.md       with <!-- e2e:start --> / <!-- e2e:end --> markers
  dist/           generated, gitignored (entities.json, gold_result.json, *_raw.json, e2e.json)
```
Start with `cp -r examples/_template examples/<id>` and fill in. Templates: `references/gold.js.md`,
`references/expand.js.md`, `references/index.js.md`, `references/readme.md`. Follow Nokia's conventions:

- Import shared helpers by relative path: `sparql, getEntities, preferredImage, commonsFileUrl` from
  `../../../lib/wikidata.js`, `imageFileFor` from `../../../lib/commons.js`. Use the SDK-based helpers, never raw `process.env` or
  ad-hoc fetches.
- `goldQuery` is exported from `src/gold.js` and uses `BIND(wd:${GOLD_QID} AS ?x)`; label service `"en"`.
- `fetchGold()` runs the gold query and `getEntities([GOLD_QID])`; label from the entity, image from
  `preferredImage(entity)`, `role: 'gold'`.
- `expandPhones`-style function: one SPARQL (`ORDER BY ?x LIMIT 1000`), `writeDist('<thing>_raw.json', data)`, group by QID in a
  `Map`, drop entities with several answers or images, drop unlabeled (`/^Q\d+$/` label), drop `exclude` (gold),
  `.slice(0, limit)`, `role: 'distractor'`.
- `entities(ctx)` returns `[gold, ...distractors]` using `ctx.imageCount` and `ctx.writeDist`.
- **`extra` stores every hop of the path plus the answer**, with the same shape for gold and distractors. For an entity hop
  store `<hop>` (QID) and `<hop>Label`; for a literal hop store the value; the last field is `answer`
  (Nokia: `{ manufacturer: 'Q1418', manufacturerLabel: 'Nokia', answer: 1865 }`). Pick the answer type deliberately
  (year number, entity QID/label, quantity, string) and keep it consistent across entities.
- **Never** put answers or hops into the Qdrant payload (`{ qid, label, image }` only); the shared runner handles that.
- Keep code style: ESM, no semicolons, single quotes, 2 spaces, comments only where non-obvious.

## 6. Run

```bash
mise run all <id>        # vector:up + build + index + e2e + docs (use `mise run vector:up` first if docker is down)
```
- Commons returns 429 (Retry-After up to 600s) during bulk downloads: `build` is resumable, just re-run `mise run build <id>`.
- `--refresh` re-runs the SPARQL expansion.
- Check `examples/<id>/dist/gold_result.json` equals the expected answer and read the e2e table. The gold entity should be
  rank 1. This is only a PoC: if it is not, report the rank and table to the user and continue (do not auto-retry).
- `mise run docs` regenerates the top-level `README.md`, `ATTRIBUTION.md` and the e2e block; never edit those by hand.

## 7. Wrap-up

Fill in the example `README.md` (see `references/readme.md`): table (image, question, path, answer), layout, gold query result,
image choice, expansion filters, caveats. Re-run `mise run docs`. Summarise to the user: entity, answer, distractor count,
gold rank, any ambiguity decisions. Then **offer to commit** (do not commit without the user's yes): example folder,
`README.md`, `ATTRIBUTION.md`; `dist/` is gitignored.

## Checklist
- [ ] `wd` checks done, ambiguities resolved with the user, expected answer reproduced
- [ ] `meta.id` == folder name; zod validation passes (`node cli.js list`)
- [ ] query image differs from the indexed gold image
- [ ] distractor count sufficient or user informed
- [ ] `extra` has all hops + `answer`; payload untouched
- [ ] `mise run all <id>` ok; gold rank reported
- [ ] README has e2e markers; docs regenerated; offered to commit
