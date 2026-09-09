import { readdirSync, readFileSync } from 'node:fs';
import './validate-book.ts';
import { asanaSchema } from '../src/core/schema.ts';
const directory = new URL('../tests/fixtures/retired-hyp/', import.meta.url);
const files = readdirSync(directory).filter((f) => f.endsWith('.json'));
const records = files.map((file) => {
  const parsed = asanaSchema.safeParse(JSON.parse(readFileSync(new URL(file, directory), 'utf8')));
  if (!parsed.success) throw new Error(`${file}: ${parsed.error.message}`);
  if (file !== `${parsed.data.id}.json`) throw new Error(`${file}: filename must match id`);
  return parsed.data;
});
const ids = new Set(records.map((a) => a.id));
if (ids.size !== records.length) throw new Error('Duplicate asana ids');
for (const a of records)
  for (const ref of [...a.relatedAsanas, ...(a.counterpose ?? [])])
    if (!ids.has(ref)) throw new Error(`${a.id}: unknown reference ${ref}`);
console.log(
  `Validated ${records.length} retired HYP regression fixtures: schema, citations, quaternions, flows and references.`,
);
