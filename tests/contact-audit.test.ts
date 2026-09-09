import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contactAudit, contacts, contactIssues, contactText } from '../src/data/contact';
import { book, bookResults } from '../src/data/book';
import models from '../src/data/brahmachari-models.json';
const read = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/^\uFEFF/, '')
    .replaceAll('\r\n', '\n');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

describe('108-pose source contact audit', () => {
  it('covers the complete book collection and every posture illustration', () => {
    expect(contactAudit.records.map((r) => r.id)).toEqual(
      book.entries.filter((e) => e.kind === 'posture').map((e) => e.id),
    );
    expect(contactAudit.scope).toEqual({
      postures: 108,
      modelStyles: 2,
      renderViews: 648,
      sourceImages: 173,
      newModelRepairs: 0,
    });
    for (const r of contactAudit.records) {
      const e = book.entries.find((e) => e.id === r.id)!;
      expect(r.reviewedImages).toEqual(e.images.map(({ id, sha256 }) => ({ id, sha256 })));
      expect(e.images.find((im) => im.id === r.sourceImage)?.src).toBe(e.hero);
    }
    expect(JSON.parse(read('public/audits/contacts/audit.json'))).toEqual(contactAudit);
  });
  it('invalidates the audit when its source, pose or rig evidence changes', () => {
    for (const [path, hash] of Object.entries(contactAudit.reviewedCode))
      expect(sha(read(path)), path).toBe(hash);
    for (const r of contactAudit.records) {
      const e = book.entries.find((e) => e.id === r.id)!;
      const source = read(`public${e.textUrl}`);
      expect(sha(source), r.id).toBe(r.sourceTextSha256);
      expect(sha(JSON.stringify(models.find((m) => m.id === r.id)!.pose)), r.id).toBe(r.poseSha256);
      for (const n of r.sourceParagraphs)
        expect(JSON.parse(source).paragraphs[n - 1], `${r.id} paragraph ${n}`).toBeTruthy();
      for (const style of ['human', 'reference'] as const) {
        expect(r.meshes[style].views).toHaveLength(3);
        for (const path of r.meshes[style].views)
          expect(existsSync(`public${path}`), path).toBe(true);
      }
    }
  });
  it('provides complete language-specific names, descriptions and contact findings', () => {
    for (const r of contactAudit.records) {
      for (const lang of ['en', 'de', 'ru'] as const) {
        expect(r.names[lang].trim().length, r.id).toBeGreaterThan(1);
        expect(r.description[lang].length, r.id).toBeGreaterThan(70);
        expect(contactText[lang].fingerModes).toHaveProperty(r.fingers);
        for (const code of [...r.hands, ...r.feet])
          expect(contactIssues[code][lang].length, `${r.id}/${code}/${lang}`).toBeGreaterThan(20);
      }
      expect(r.description.en).not.toMatch(/[\u0400-\u04ff]/);
      expect(r.description.de).not.toMatch(/[\u0400-\u04ff]/);
      expect(r.description.ru).toMatch(/[\u0400-\u04ff]/);
      expect(book.entries.find((e) => e.id === r.id)!.summary).toBe(r.description.en);
      expect(r.status).toBe('corrections-required');
    }
  });
  it('records source-specific contacts that generic pose names previously concealed', () => {
    expect(contacts['mandukasana'].description.en).toMatch(/navel/);
    expect(contacts['nadi-sodhanasana'].description.en).toMatch(/backward/);
    expect(contacts['meru-dandasana'].description.en).toMatch(/chin/);
    expect(contacts['tolangulasana'].fingers).toBe('fingertip_support');
    expect(contacts['tadasana'].description.en).toMatch(/outward/);
  });
  it('finds each posture by its reviewed German and Russian name', () => {
    for (const r of contactAudit.records)
      for (const lang of ['de', 'ru'] as const) {
        expect(
          bookResults(new URLSearchParams({ q: r.names[lang] })).entries.map((e) => e.id),
          `${r.id}/${lang}`,
        ).toContain(r.id);
      }
  });
});
