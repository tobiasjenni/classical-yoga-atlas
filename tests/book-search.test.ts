import { describe, it, expect } from 'vitest';
import { bookResults, book, pageSize } from '../src/data/book';
const find = (query = '') => bookResults(new URLSearchParams(query));
describe('Book discovery', () => {
  it('pages all 108 postures once, keeping the separate sequence discoverable', () => {
    expect(find().pages).toBe(9);
    const ids = Array.from({ length: 9 }, (_, i) =>
      find(`page=${i + 1}`).visible.map((e) => e.id),
    ).flat();
    expect(ids).toHaveLength(108);
    expect(new Set(ids).size).toBe(108);
    expect(find('family=sequence').entries.map((e) => e.kind)).toEqual(['sequence']);
    expect(find('q=sun+salutation').entries[0].kind).toBe('sequence');
  });
  it.each(['vrksa', 'VṚKṢA', 'वृक्ष', 'ВРИКША', 'handstand'])(
    'finds the same source section from %s',
    (query) => {
      expect(find(`q=${encodeURIComponent(query)}`).entries.map((e) => e.id)).toContain(
        'vrksasana',
      );
    },
  );
  it('combines search and family filters, including hyphens and unaccented names', () => {
    expect(find('q=padangusthanasa&family=standing').entries.map((e) => e.id)).toEqual([
      'padangustha-nasa-sparsasana',
    ]);
    expect(find('q=lotus&family=prone').entries).toHaveLength(0);
    expect(find('q=definitely-no-such-posture').entries).toHaveLength(0);
  });
  it('clamps malformed and out-of-range page links', () => {
    for (const page of ['NaN', 'Infinity', '-3', '0', ''])
      expect(find(`page=${page}`).page).toBe(1);
    expect(find('page=999').page).toBe(9);
    expect(find('page=2.9').page).toBe(2);
    expect(find('family=invalid').visible).toHaveLength(pageSize);
    expect(find('q=unmatched&page=99').page).toBe(1);
  });
  it('keeps sorting local to the results and preserves source order', () => {
    const before = book.entries.map((e) => e.id);
    const sorted = find('sort=name').entries;
    expect(sorted.map((e) => e.iast)).toEqual(
      [...sorted.map((e) => e.iast)].sort((a, b) => a.localeCompare(b)),
    );
    expect(book.entries.map((e) => e.id)).toEqual(before);
  });
  it('keeps editorial contact flags and HYP source differences separate', () => {
    expect(find('review=refine').entries.length).toBeGreaterThan(0);
    expect(find('review=different').entries.every((e) => !!e.comparison)).toBe(true);
    expect(find('review=related').entries.every((e) => !!e.relatedModel)).toBe(true);
  });
});
