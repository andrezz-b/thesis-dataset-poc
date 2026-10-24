import { AutoProcessor, AutoTokenizer, CLIPVisionModelWithProjection, CLIPTextModelWithProjection, RawImage } from '@huggingface/transformers'

const normalise = rows => rows.map(v => {
  const n = Math.hypot(...v) || 1
  return v.map(x => x / n)
})

export async function clipProvider(modelId, dim) {
  const [processor, vision, tokenizer, text] = await Promise.all([
    AutoProcessor.from_pretrained(modelId),
    CLIPVisionModelWithProjection.from_pretrained(modelId, { dtype: 'fp32' }),
    AutoTokenizer.from_pretrained(modelId),
    CLIPTextModelWithProjection.from_pretrained(modelId, { dtype: 'fp32' }),
  ])
  return {
    name: modelId,
    dim,
    async embedImages(paths) {
      const out = []
      for (const p of paths) {
        const image = await RawImage.read(p)
        const { image_embeds } = await vision(await processor(image))
        out.push(Array.from(image_embeds.data))
      }
      return normalise(out)
    },
    async embedTexts(texts) {
      const { text_embeds } = await text(tokenizer(texts, { padding: true, truncation: true }))
      return normalise(text_embeds.tolist())
    },
  }
}
