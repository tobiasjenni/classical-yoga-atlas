import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const origin = process.argv[2];
if (!origin || !/^https?:\/\//.test(origin))
  throw new Error('Usage: npm run verify:site -- https://your-site.example');
const book = JSON.parse(
  readFileSync(new URL('../src/data/brahmachari.json', import.meta.url), 'utf8'),
);
let checked = 0;
const images = book.entries.flatMap((e) => e.images);
for (let i = 0; i < images.length; i += 8) {
  await Promise.all(
    images.slice(i, i + 8).map(async (image) => {
      const response = await fetch(new URL(image.src, origin));
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
        throw new Error(`Missing image: ${image.src} (${response.status})`);
      const hash = createHash('sha256')
        .update(Buffer.from(await response.arrayBuffer()))
        .digest('hex');
      if (hash !== image.sha256) throw new Error(`Changed image: ${image.src}`);
      checked++;
    }),
  );
}
for (const path of [
  '/',
  '/brahmachari/gomukhasana',
  '/brahmachari/surya-namaskar',
  '/brahmachari/karna-pidasana',
  '/sequence',
  '/sources',
]) {
  const response = await fetch(new URL(path, origin), {
    headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' },
  });
  if (!response.ok || !(await response.text()).includes('<div id="root"></div>'))
    throw new Error(`Broken app route: ${path}`);
}
console.log(`Verified ${checked} original picture hashes and six application routes at ${origin}`);
