import fs from 'node:fs';
import crypto from 'node:crypto';
const read = (p) =>
  fs
    .readFileSync(p, 'utf8')
    .replace(/^\uFEFF/, '')
    .replaceAll('\r\n', '\n');
const json = (p) => JSON.parse(read(p));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const write = (p, data) => fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
const book = json('src/data/brahmachari.json');
const models = json('src/data/brahmachari-models.json');
const renders = json('public/audits/blender/audit-data.json');
const issues = Object.fromEntries(
  read('scripts/book/contact-issues.tsv')
    .trim()
    .split('\n')
    .map((line) => {
      const [code, en, de, ru] = line.split('|');
      if (!code || !en || !de || !ru) throw new Error(`Incomplete issue: ${code}`);
      const status = ['schematic', 'support_surface', 'prayer_contact'].includes(code)
        ? 'schematic'
        : code === 'source_unclear'
          ? 'source-limited'
          : code === 'variant_conflict'
            ? 'variant-specific'
            : 'correction-needed';
      return [code, { status, en, de, ru }];
    }),
);
const names = {
  45: 'Kneeling lotus mountain',
  55: 'One-leg open-arm balance',
  59: 'Wide-leg arm balance',
  60: 'Forward fold with both ankle holds',
  64: 'Backward bend with ankle holds',
  73: 'One-leg shoulder pose with neck clasp',
  75: 'Kneeling foot hold',
  95: 'Prone ankle-to-chin hold',
  104: 'Bird balance with leg behind the neck',
};
const records = read('scripts/book/contact-review.tsv')
  .trim()
  .split('\n')
  .map((line) => {
    const fields = line.split('|');
    if (fields.length !== 10) throw new Error(`Expected 10 fields at ${fields[0]}`);
    const [n, de, ru, enText, deText, ruText, hands, feet, fingers, paragraphs] = fields;
    const entry = book.entries.find((e) => e.order === Number(n) && e.kind === 'posture');
    if (!entry) throw new Error(`Unknown posture: ${n}`);
    if (names[n]) entry.english = names[n];
    entry.summary = enText;
    const model = models.find((m) => m.id === entry.id);
    const render = renders.models.find((m) => m.id === entry.id);
    const source = read(`public${entry.textUrl}`);
    const refs = paragraphs.split(',').map(Number);
    if (refs.some((p) => !JSON.parse(source).paragraphs[p - 1]))
      throw new Error(`Bad paragraph: ${entry.id}`);
    const handCodes = hands.split(','),
      footCodes = feet.split(',');
    for (const c of [...handCodes, ...footCodes])
      if (!issues[c]) throw new Error(`Unknown issue ${c}`);
    return {
      id: entry.id,
      order: entry.order,
      names: { en: entry.english, de, ru },
      description: { en: enText, de: deText, ru: ruText },
      hands: handCodes,
      feet: footCodes,
      fingers,
      status: 'corrections-required',
      sourceImage: model.image,
      sourceParagraphs: refs,
      sourceTextSha256: sha(source),
      reviewedImages: entry.images.map((i) => ({ id: i.id, sha256: i.sha256 })),
      poseSha256: sha(JSON.stringify(model.pose)),
      meshes: Object.fromEntries(
        ['human', 'reference'].map((style) => [
          style,
          {
            sha256: render.styles[style].diagnostics.meshSha256,
            views: render.styles[style].images.map((p) => `/audits/blender/${p}`),
          },
        ]),
      ),
    };
  });
if (records.length !== 108 || new Set(records.map((r) => r.id)).size !== 108)
  throw new Error('Audit must cover exactly 108 distinct postures');
const result = {
  date: '2026-09-09',
  sourceBookSha256: book.sha256,
  method:
    'Visual comparison of all 108 primary plates with existing Blender front, side and rear renders in both styles, plus all 65 additional section images and the Russian contact descriptions. Findings are editorial observations, not anatomical certification. Hidden contacts cannot be inferred from a single view. No model geometry or poses were repaired by this audit.',
  scope: {
    postures: 108,
    modelStyles: 2,
    renderViews: 648,
    sourceImages: records.reduce((s, r) => s + r.reviewedImages.length, 0),
    newModelRepairs: 0,
  },
  rigLimitation:
    'Both model styles attach every finger to a single rigid hand bone. Individual fingers and toes cannot be posed. A successful mesh render does not verify a grip, mudra, pressure distribution or anatomical feasibility.',
  reviewedCode: Object.fromEntries(
    ['src/core/rig.ts', 'src/core/human-geometry.ts', 'src/core/bones.ts'].map((p) => [
      p,
      sha(read(p)),
    ]),
  ),
  issues,
  records,
};
write('src/data/contact-audit.json', result);
fs.mkdirSync('public/audits/contacts', { recursive: true });
write('public/audits/contacts/audit.json', result);
write('src/data/brahmachari.json', book);
// Keep regenerated book imports consistent with the reviewed English descriptions.
const catalogue = read('scripts/book/catalogue.txt')
  .trim()
  .split('\n')
  .map((line, i) => {
    const p = line.split('|');
    const r = records[i];
    if (r) {
      p[1] = r.names.en;
      p[3] = r.description.en;
    }
    return p.join('|');
  });
fs.writeFileSync('scripts/book/catalogue.txt', catalogue.join('\n') + '\n');
const report = [
  '# Hand, foot and finger audit — 9 September 2026',
  '',
  result.method,
  '',
  result.rigLimitation,
  '',
  `Coverage: ${result.scope.postures} postures, ${result.scope.sourceImages} book images, 216 models and 648 rendered views. All 108 have unresolved contact or articulation limitations. Descriptions in English, German and Russian are editorial readings of the source, not verbatim translations of the entire book. The original Russian transcripts remain unchanged.`,
  '',
  'The source paragraph numbers are one-based within the original section transcript, not printed page numbers. The JSON download contains source and pose hashes, evidence images and translated findings. No unseen rear contact or indistinct mudra is certified.',
  '',
  ...records.flatMap((r) => [
    `## ${r.order}. ${book.entries[r.order - 1].iast} — ${r.names.en}`,
    '',
    `Source: ${r.sourceImage}; paragraphs ${r.sourceParagraphs.join(', ')}.`,
    '',
    `**English:** ${r.description.en}`,
    '',
    `**Deutsch — ${r.names.de}:** ${r.description.de}`,
    '',
    `**Русский — ${r.names.ru}:** ${r.description.ru}`,
    '',
    `Hands: ${r.hands.map((c) => issues[c].en).join(' ')}`,
    '',
    `Feet: ${r.feet.map((c) => issues[c].en).join(' ')}`,
    '',
    `Fingers: ${r.fingers}; individual articulation unavailable in both model styles.`,
    '',
    `[Source and model evidence](https://classical-yoga-atlas.toebu-jenni.workers.dev/audit?q=${r.id})`,
    '',
  ]),
].join('\n');
fs.writeFileSync('public/audits/contacts/report.md', report + '\n');
console.log(
  `Built ${records.length} contact records, ${result.scope.sourceImages} source images, three languages. No model repairs claimed.`,
);
