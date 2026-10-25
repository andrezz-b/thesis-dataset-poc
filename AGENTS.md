# AGENTS.md

Proof of concept for an **image QA dataset over Wikidata**: an image of an entity plus a question answered by walking the
Wikidata graph. Example: Nokia 3310 photo + "In which year was this phone's manufacturer founded?"
(`manufacturer P176 → inception P571` → 1865). Details and results: `nokia_example/README.md`.

## Stack and rules
- JavaScript only (Node 24, ESM, `"type": "module"`). **No Python.** Tool versions are managed by `mise.toml`.
- Wikidata access via `wikibase-sdk` (it only builds URLs; we `fetch` them ourselves with a `User-Agent`, see `nokia_example/lib.js`).
  The `wd` CLI (wikibase-cli, configured in `mise.toml`) is fine for ad-hoc checks, but scripts must use the SDK for reproducibility.
- Vector DB: Qdrant (docker). Embeddings: CLIP via `@huggingface/transformers` (runs on CPU in Node).
- Verify claims against live Wikidata; do not trust query patterns from memory (e.g. the phone class is `P31 wd:Q19723444`
  "cell phone model", not `Q17517`).

## Layout
```
embeddings/       reusable, swappable embedding providers (index.js registry, clip.js)
vector_index/     reusable Qdrant docker-compose, up.sh, qdrant.js wrapper
nokia_example/    the example: numbered scripts, dataset.json, images/, query/, README.md, ATTRIBUTION.md
```
`embeddings/` and `vector_index/` must stay example-agnostic; new examples get their own top-level folder and reuse them.

## Commands
```bash
npm install
mise run vector:up | vector:down | vector:reset     # Qdrant on :6333
cd nokia_example
node 01_gold_query.js          # gold SPARQL for Nokia 3310
node 02_download_nokia.js      # preferred-rank P18 image (512px thumbnail)
node 03_expand.js              # SPARQL expansion -> dataset.json (25 phones)
node 04_download_images.js     # resumable; Commons returns 429 with Retry-After (up to 600s)
node 05_index.js               # embed + upsert into Qdrant (needs vector:up)
node 06_query.js query/nokia_3310_blue.jpg 5 [--md]   # e2e: image -> top-5 entities
node 07_attribution.js         # author/licence per image -> ATTRIBUTION.md
```
There is no test suite; the e2e check is step 06 (Nokia 3310 must be rank 1 for the query image).

## Conventions
- Embedder is chosen with `EMBEDDER=<key>` (default `clip-b32`); add providers in `embeddings/index.js`
  (`name`, `dim`, `embedImages`, `embedTexts`, L2-normalised vectors). Collections are named `<example>__<model>`.
- Qdrant point id = numeric part of the QID; payload is entity-only: `{ qid, label, image }`. Do not put question answers
  (manufacturer, inception year) in the index; ground truth lives in `dataset.json` / `gold_query_result.json`.
- Images are Wikimedia Commons files kept under `nokia_example/images/` as 512px thumbnails, named `<QID>_<file>`.
  Keep `ATTRIBUTION.md` in sync (re-run `07_attribution.js`) when images change.
- Keep the Qdrant client and server versions compatible (currently 1.20.x); use `client.query`, not `search`.
- Set a descriptive `User-Agent` on every Wikimedia request and throttle bulk downloads.
- If `gh` fails with a limited-scope token, `GITHUB_TOKEN` in `~/.zshrc` is overriding the keyring login; unset it for the session.
- Keep `nokia_example/README.md` in step with script behaviour and regenerate its e2e table with `06_query.js ... --md`.
