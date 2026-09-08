import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { asanaSchema, flowFramesSchema, sourceSchema } from '../src/core/schema';
import { blankFlow, duration, sample } from '../src/core/motion';
import { boneNames } from '../src/core/bones';
const dir = new URL('../src/data/asanas/', import.meta.url);
const records = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => asanaSchema.parse(JSON.parse(readFileSync(new URL(f, dir), 'utf8'))));
describe('seed integrity and negative validation', () => {
  it('rejects precomputed movement paths after either endpoint changes', () => {
    const frames = structuredClone(records.find((a) => a.keyframes.some((f) => f.path))!.keyframes);
    const index = frames.findIndex((f) => f.path);
    frames[index].path![0].root.position[0] += 0.1;
    expect(flowFramesSchema.safeParse(frames).success).toBe(false);
  });
  it('publishes exactly the confirmed fifteen entries', () => {
    expect(records.map((a) => a.id).sort()).toEqual(
      [
        'svastikasana',
        'gomukhasana',
        'virasana',
        'kurmasana',
        'kukkutasana',
        'uttana-kurmasana',
        'dhanurasana',
        'matsyendrasana',
        'paschimottanasana',
        'mayurasana',
        'shavasana',
        'siddhasana',
        'padmasana',
        'simhasana',
        'bhadrasana',
      ].sort(),
    );
  });
  it('has complete finite poses throughout every flow', () => {
    for (const a of records)
      for (let t = 0; t <= duration(a.keyframes); t += 0.25) {
        const p = sample(a.keyframes, t);
        for (const name of boneNames) expect(Math.hypot(...p.bones[name]!)).toBeCloseTo(1, 4);
        expect(p.root.position.every(Number.isFinite)).toBe(true);
      }
  });
  it('rejects absent or out-of-order phases without throwing', () => {
    expect(flowFramesSchema.safeParse([]).success).toBe(false);
    const frames = blankFlow();
    frames[2].phase = 'exit';
    expect(flowFramesSchema.safeParse(frames).success).toBe(false);
    expect(asanaSchema.safeParse({ ...records[0], keyframes: [] }).success).toBe(false);
  });
  it('rejects moving holds and discontinuous loop endpoints', () => {
    const frames = blankFlow();
    frames[4].pose.root.position[0] = 0.1;
    expect(flowFramesSchema.safeParse(frames).success).toBe(false);
    frames[4].pose.root.position[0] = 0;
    frames[6].pose.root.position[1] = 2;
    expect(flowFramesSchema.safeParse(frames).success).toBe(false);
  });
  it('requires a real reference location for attested source metadata', () => {
    const source = { ...records[0].source[0], verse: '' };
    expect(sourceSchema.safeParse(source).success).toBe(false);
    expect(sourceSchema.safeParse({ ...source, provenance: 'unverified' }).success).toBe(true);
  });
  it('separates attestation from reconstruction for every record', () => {
    for (const a of records) {
      expect(a.provenance).toBe('attested');
      expect(a.fieldProvenance.movement).toBe('unverified');
      expect(a.keyframes.every((f) => f.provenance === 'unverified')).toBe(true);
      expect(a.source[0].edition).toContain('1914');
    }
  });
});
