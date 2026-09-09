import { z } from 'zod';
import { book, bookModels } from '../data/book';
export const sequencePostures = book.entries.filter((e) => e.kind === 'posture');
export const sequenceById = Object.fromEntries(sequencePostures.map((e) => [e.id, e]));
export const bookSequenceStorageKey = 'atlas-book-sequence-v2';
export const maxSequenceItems = 216;
export const sequenceItemSchema = z
  .object({
    id: z
      .string()
      .refine((id) => Object.hasOwn(sequenceById, id), 'Choose one of the 108 book asanas.'),
    holdSeconds: z.number().finite().min(1).max(600),
  })
  .strict();
export const bookSequenceDraftSchema = z
  .object({
    schemaVersion: z.literal(2),
    kind: z.literal('book-reference-sequence'),
    source: z.literal('brahmachari-yogasana-vijnana'),
    name: z.string().max(120),
    items: z.array(sequenceItemSchema).max(maxSequenceItems),
  })
  .strict();
export const bookSequenceSchema = bookSequenceDraftSchema.extend({
  name: z.string().trim().min(1).max(120),
  items: z.array(sequenceItemSchema).min(1).max(maxSequenceItems),
});
export type BookSequence = z.infer<typeof bookSequenceDraftSchema>;
export type SequenceItem = z.infer<typeof sequenceItemSchema>;
export const emptyBookSequence = (): BookSequence => ({
  schemaVersion: 2,
  kind: 'book-reference-sequence',
  source: 'brahmachari-yogasana-vijnana',
  name: 'My book sequence',
  items: [],
});
export function sequenceDuration(items: SequenceItem[]) {
  return items.reduce((sum, i) => sum + i.holdSeconds, 0);
}
export function sequenceStart(items: SequenceItem[], index: number) {
  return sequenceDuration(items.slice(0, index));
}
// Direct changes between source poses: never interpolate an unverified transition.
export function sampleBookSequence(items: SequenceItem[], seconds: number) {
  if (!items.length) return null;
  const time = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  let start = 0;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    if (time < start + item.holdSeconds || index === items.length - 1)
      return {
        index,
        start,
        elapsed: Math.min(item.holdSeconds, time - start),
        entry: sequenceById[item.id],
        pose: bookModels[item.id].pose,
      };
    start += item.holdSeconds;
  }
  return null;
}
export function moveSequenceItem<T>(items: T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const next = [...items],
    [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
