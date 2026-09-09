import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { poseSchema } from '../src/core/schema.ts';
const root = new URL('../', import.meta.url);
const book = JSON.parse(readFileSync(new URL('src/data/brahmachari.json', root), 'utf8'));
const models = JSON.parse(readFileSync(new URL('src/data/brahmachari-models.json', root), 'utf8'));
const ids = new Set<string>(),
  images = new Set<string>();
if (
  book.entries.length !== 109 ||
  book.entries.filter((e: any) => e.kind === 'posture').length !== 108 ||
  models.length !== 108
)
  throw new Error('Expected 108 book postures, 108 models and one separate sequence');
for (const [index, e] of book.entries.entries()) {
  if (e.order !== index + 1) throw new Error(`Book order changed: ${e.id}`);
  if (e.relatedModel && !/^[a-z-]+$/.test(e.relatedModel)) throw new Error('Unsafe comparison ID');
  if (e.relatedModel)
    readFileSync(new URL(`tests/fixtures/retired-hyp/${e.relatedModel}.json`, root));
  if (
    ids.has(e.id) ||
    !e.english ||
    !e.iast ||
    !/[\u0900-\u097f]/.test(e.sanskrit) ||
    !e.russian ||
    !e.file
  )
    throw new Error(`Invalid book identity ${e.id}`);
  ids.add(e.id);
  if (!e.images.length || !e.images.some((im: any) => im.src === e.hero))
    throw new Error(`Missing book picture ${e.id}`);
  for (const im of e.images) {
    if (!/^\/book\/brahmachari\/Im\d+\.(jpg|png|gif)$/.test(im.src))
      throw new Error('Unsafe picture path');
    const bytes = readFileSync(new URL('public' + im.src, root));
    if (createHash('sha256').update(bytes).digest('hex') !== im.sha256)
      throw new Error(`Source picture changed ${im.id}`);
    if (images.has(im.id)) throw new Error(`Duplicate illustration ID: ${im.id}`);
    images.add(im.id);
  }
  if (!/^\/book\/brahmachari\/[a-z-]+\.json$/.test(e.textUrl)) throw new Error('Unsafe text path');
  const text = JSON.parse(readFileSync(new URL('public' + e.textUrl, root), 'utf8'));
  if (
    !Array.isArray(text.paragraphs) ||
    !text.paragraphs.every((p: unknown) => typeof p === 'string')
  )
    throw new Error(`Invalid source text ${e.id}`);
}
if (images.size !== 185) throw new Error('Expected all 185 source illustrations');
const modelIds = new Set();
for (const m of models) {
  if (modelIds.has(m.id) || !ids.has(m.id) || m.id === 'surya-namaskar')
    throw new Error(`Invalid book model ${m.id}`);
  modelIds.add(m.id);
  poseSchema.parse(m.pose);
  const e = book.entries.find((e: any) => e.id === m.id);
  if (!e.images.some((im: any) => im.id === m.image && im.src === e.hero))
    throw new Error(`Model has the wrong source picture: ${m.id}`);
  if (m.provenance !== 'unverified') throw new Error('Book reconstructions must remain unverified');
}
console.log(
  'Validated 108 book models, Sanskrit/English names, 109 sections and 185 original illustration hashes.',
);
