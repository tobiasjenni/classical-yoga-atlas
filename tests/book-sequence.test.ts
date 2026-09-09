import { describe, expect, it } from 'vitest';
import { bookModels } from '../src/data/book';
import {
  bookSequenceDraftSchema,
  bookSequenceSchema,
  emptyBookSequence,
  moveSequenceItem,
  sampleBookSequence,
  sequenceDuration,
  sequencePostures,
  sequenceStart,
} from '../src/core/book-sequence';
const full = () => ({
  ...emptyBookSequence(),
  items: sequencePostures.map((e, i) => ({ id: e.id, holdSeconds: (i % 10) + 1 })),
});
describe('108-asana book sequences', () => {
  it('exports and imports the full book with its order and hold times intact', () => {
    const sequence = full();
    expect(sequence.items).toHaveLength(108);
    expect(new Set(sequence.items.map((i) => i.id)).size).toBe(108);
    expect(bookSequenceSchema.parse(JSON.parse(JSON.stringify(sequence)))).toEqual(sequence);
    expect(sequence.items.some((i) => i.id === 'surya-namaskar')).toBe(false);
  });
  it('shows the exact book mesh throughout every hold, including boundaries', () => {
    const { items } = full();
    items.forEach((item, index) => {
      const start = sequenceStart(items, index);
      for (const offset of [0, item.holdSeconds / 2, item.holdSeconds - 0.001]) {
        const state = sampleBookSequence(items, start + offset)!;
        expect(state.index).toBe(index);
        expect(state.pose).toBe(bookModels[item.id].pose);
        expect(state.entry.id).toBe(item.id);
      }
    });
    expect(sampleBookSequence(items, sequenceDuration(items))?.index).toBe(107);
    expect(sampleBookSequence(items, sequenceDuration(items) + 100)?.elapsed).toBe(
      items[107].holdSeconds,
    );
    expect(sampleBookSequence(items, -100)?.index).toBe(0);
    expect(sampleBookSequence([], 5)).toBeNull();
  });
  it('preserves repeated entries and their independent holds when reordered', () => {
    const items = [
      { id: 'padmasana', holdSeconds: 5 },
      { id: 'siddhasana', holdSeconds: 8 },
      { id: 'padmasana', holdSeconds: 25 },
    ];
    const moved = moveSequenceItem(items, 2, 0);
    expect(moved.map((i) => i.holdSeconds)).toEqual([25, 5, 8]);
    expect(items.map((i) => i.holdSeconds)).toEqual([5, 8, 25]);
    expect(bookSequenceSchema.parse({ ...emptyBookSequence(), items: moved }).items).toEqual(moved);
    expect(moveSequenceItem(items, -1, 0)).toBe(items);
    expect(moveSequenceItem(items, 0, 3)).toBe(items);
  });
  it('rejects legacy HYP exports even when names overlap', () => {
    expect(
      bookSequenceSchema.safeParse({
        schemaVersion: 1,
        kind: 'reference-sequence',
        name: 'Old draft',
        provenance: 'unverified',
        transitionSeconds: 2,
        asanas: ['dhanurasana'],
      }).success,
    ).toBe(false);
  });
  it('rejects unknown IDs, invalid times, excessive length and a different source', () => {
    for (const id of ['surya-namaskar', 'missing', '__proto__', 'constructor'])
      expect(
        bookSequenceSchema.safeParse({ ...emptyBookSequence(), items: [{ id, holdSeconds: 10 }] })
          .success,
      ).toBe(false);
    for (const holdSeconds of [0, -1, 601, NaN, Infinity])
      expect(
        bookSequenceSchema.safeParse({
          ...emptyBookSequence(),
          items: [{ id: 'padmasana', holdSeconds }],
        }).success,
      ).toBe(false);
    expect(bookSequenceSchema.safeParse({ ...full(), source: 'hyp' }).success).toBe(false);
    expect(
      bookSequenceSchema.safeParse({ ...full(), items: Array(217).fill(full().items[0]) }).success,
    ).toBe(false);
    expect(bookSequenceSchema.safeParse({ ...full(), name: '   ' }).success).toBe(false);
  });
  it('restores an empty local draft while requiring a nonempty portable sequence', () => {
    expect(bookSequenceDraftSchema.parse(emptyBookSequence()).items).toEqual([]);
    expect(bookSequenceSchema.safeParse(emptyBookSequence()).success).toBe(false);
  });
});
