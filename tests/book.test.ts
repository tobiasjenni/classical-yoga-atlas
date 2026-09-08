import { describe, it, expect } from 'vitest';
import { Vector3 } from 'three';
import { makeRig, applyPose } from '../src/core/rig';
import { poseSchema } from '../src/core/schema';
import { bodyClearance } from '../src/core/clearance';
import book from '../src/data/brahmachari.json';
import raw from '../src/data/brahmachari-models.json';
const models = raw.map((m) => ({ ...m, pose: poseSchema.parse(m.pose) }));
describe('Brahmachari primary collection', () => {
  it('keeps all 108 models linked to their own book illustrations', () => {
    expect(models).toHaveLength(108);
    expect(book.entries).toHaveLength(109);
    expect(new Set(models.map((m) => m.id)).size).toBe(108);
    for (const m of models) {
      const e = book.entries.find((e) => e.id === m.id)!;
      expect(e.kind).toBe('posture');
      expect(e.images.find((im) => im.id === m.image)?.src).toBe(e.hero);
      expect(e.sanskrit).toMatch(/[\u0900-\u097f]/);
      expect(e.iast.length).toBeGreaterThan(3);
      expect(e.english.trim().length).toBeGreaterThan(0);
    }
    expect(book.entries.at(-1)!.images).toHaveLength(12);
  });
  it.each(['human', 'reference'] as const)(
    'keeps the complete %s mesh above the floor in every book pose',
    (style) => {
      const r = makeRig(style),
        p = new Vector3(),
        v = r.mesh.geometry.getAttribute('position');
      for (const m of models) {
        applyPose(r, m.pose);
        r.mesh.skeleton.update();
        let low = Infinity,
          finite = true;
        for (let i = 0; i < v.count; i++) {
          p.fromBufferAttribute(v, i);
          r.mesh.applyBoneTransform(i, p);
          finite &&= Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
          low = Math.min(low, p.y);
        }
        expect(finite, m.id).toBe(true);
        expect(low, m.id).toBeGreaterThanOrEqual(-0.002);
      }
      r.mesh.skeleton.dispose();
    },
    20000,
  );
  it('checks actual body clearance for every book study', () => {
    const r = makeRig();
    for (const m of models) {
      applyPose(r, m.pose);
      expect(Math.min(...bodyClearance(r).map((h) => h.gap)), m.id).toBeGreaterThanOrEqual(-0.001);
    }
    r.mesh.skeleton.dispose();
  });
  it('distinguishes the book’s lunge, overhead fold, kneeling seat and handstand', () => {
    const r = makeRig();
    const point = (n: string) =>
      r.bones[`mixamorig${n}` as keyof typeof r.bones].getWorldPosition(new Vector3());
    const set = (id: string) => applyPose(r, models.find((m) => m.id === id)!.pose);
    set('virasana');
    expect(point('LeftFoot').z - point('RightFoot').z).toBeGreaterThan(1);
    set('dhanurasana');
    expect(point('LeftFoot').z).toBeLessThan(point('Head').z - 0.1);
    set('bhadrasana');
    expect(point('LeftLeg').z - point('LeftFoot').z).toBeGreaterThan(0.25);
    set('vrksasana');
    expect(point('LeftFoot').y - point('Head').y).toBeGreaterThan(1);
    expect(point('LeftHand').y).toBeLessThan(point('Head').y);
    set('ustrasana');
    expect(point('LeftHand').distanceTo(point('LeftFoot'))).toBeLessThan(0.18);
    r.mesh.skeleton.dispose();
  });
  it('preserves the standing stance and grounded overhead fold seen in the audited pictures', () => {
    const r = makeRig();
    const point = (n: string) =>
      r.bones[`mixamorig${n}` as keyof typeof r.bones].getWorldPosition(new Vector3());
    applyPose(r, models.find((m) => m.id === 'kalabhairavasana')!.pose);
    expect(point('LeftFoot').z - point('RightFoot').z).toBeGreaterThan(0.3);
    expect(point('LeftFoot').y).toBeLessThan(0.08);
    expect(point('RightFoot').y).toBeLessThan(0.08);
    expect(point('LeftUpLeg').distanceTo(point('LeftFoot'))).toBeGreaterThan(0.82);
    expect(point('LeftHand').z - point('RightHand').z).toBeGreaterThan(1);
    applyPose(r, models.find((m) => m.id === 'sarvangasana')!.pose);
    expect(point('Head').y).toBeLessThan(0.15);
    expect(point('LeftHand').y).toBeLessThan(0.08);
    expect(point('LeftHand').z).toBeGreaterThan(point('Head').z + 0.6);
    expect(point('LeftArm').distanceTo(point('LeftHand'))).toBeGreaterThan(0.61);
    expect(point('LeftUpLeg').distanceTo(point('LeftFoot'))).toBeGreaterThan(0.82);
    r.mesh.skeleton.dispose();
  });
  it('does not collapse visibly different balances into one generic pose', () => {
    const r = makeRig();
    const relativeFoot = (id: string) => {
      applyPose(r, models.find((m) => m.id === id)!.pose);
      return r.bones.mixamorigLeftFoot
        .getWorldPosition(new Vector3())
        .sub(r.bones.mixamorigHips.getWorldPosition(new Vector3()));
    };
    expect(
      relativeFoot('purvottanasana').distanceTo(relativeFoot('meru-dandasana')),
    ).toBeGreaterThan(0.15);
    expect(relativeFoot('kandapidasana').distanceTo(relativeFoot('bhagasana'))).toBeGreaterThan(
      0.1,
    );
    r.mesh.skeleton.dispose();
  });
});
