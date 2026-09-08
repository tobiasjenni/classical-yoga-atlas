import book from './brahmachari.json';
import rawModels from './brahmachari-models.json';
import { poseSchema } from '../core/schema';
import { matchesSearch } from '../core/search';
export { book };
export type BookEntry = (typeof book.entries)[number];
export const bookModels = Object.fromEntries(
  rawModels.map((model) => [model.id, { ...model, pose: poseSchema.parse(model.pose) }]),
);
export const bookFamilies = [
  'seated',
  'kneeling',
  'standing',
  'prone',
  'supine',
  'inverted',
  'balance',
  'sequence',
];
export const pageSize = 12;
export function bookResults(params: URLSearchParams) {
  const family = params.get('family'),
    review = params.get('review');
  const entries = book.entries.filter(
    (entry) =>
      (entry.kind === 'posture' || family === 'sequence' || !!params.get('q')?.trim()) &&
      matchesSearch(
        `${entry.name} ${entry.iast} ${entry.sanskrit} ${entry.english} ${entry.russian}`,
        params.get('q') ?? '',
      ) &&
      (!bookFamilies.includes(family ?? '') || entry.family === family) &&
      (review === 'related'
        ? !!entry.relatedModel
        : review === 'different'
          ? !!entry.comparison
          : review === 'refine'
            ? bookModels[entry.id]?.review === 'needs-refinement'
            : true),
  );
  if (params.get('sort') === 'name') entries.sort((a, b) => a.iast.localeCompare(b.iast));
  const pages = Math.max(1, Math.ceil(entries.length / pageSize));
  const requested = Number(params.get('page') ?? 1);
  const page = Number.isFinite(requested) ? Math.max(1, Math.min(pages, Math.floor(requested))) : 1;
  return { entries, pages, page, visible: entries.slice((page - 1) * pageSize, page * pageSize) };
}
