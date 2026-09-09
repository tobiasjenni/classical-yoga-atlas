import { readFileSync, readdirSync } from 'node:fs';
import { Vector3, Quaternion } from 'three';
import { describe, expect, it } from 'vitest';
import { asanaSchema } from '../src/core/schema';
import { applyPose, makeRig, definitions } from '../src/core/rig';
import { blendLimbs, duration, frameTime, sample, mirrorPose, identity } from '../src/core/motion';
import { bodyClearance } from '../src/core/clearance';
const dir = new URL('./fixtures/retired-hyp/', import.meta.url);
const records = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => asanaSchema.parse(JSON.parse(readFileSync(new URL(f, dir), 'utf8'))));
const get = (id: string) => records.find((a) => a.id === id)!;
const rig = makeRig();
const point = new Vector3();
const endPosition = (name: keyof typeof rig.bones) =>
  rig.bones[name].getWorldPosition(new Vector3());

describe('reconstructed motion geometry', () => {
  it.each(['reference', 'human'] as const)(
    'keeps the entire %s mesh above the floor throughout all 15 flows',
    (style) => {
      const rig = makeRig(style);
      const vertices = rig.mesh.geometry.getAttribute('position');
      for (const a of records) {
        let minimum = Infinity,
          worstTime = 0;
        const times = a.keyframes.map((f) => f.pose);
        for (let t = 0; t <= duration(a.keyframes); t += 0.1) times.push(sample(a.keyframes, t));
        times.forEach((pose, index) => {
          applyPose(rig, pose);
          rig.mesh.skeleton.update();
          for (let i = 0; i < vertices.count; i++) {
            point.fromBufferAttribute(vertices, i);
            rig.mesh.applyBoneTransform(i, point);
            if (point.y < minimum) {
              minimum = point.y;
              worstTime = index;
            }
          }
        });
        expect(
          minimum,
          `${a.id}: lowest vertex ${minimum} at sample ${worstTime}`,
        ).toBeGreaterThanOrEqual(-0.002);
      }
      rig.mesh.skeleton.dispose();
    },
    30000,
  );
  it('keeps limbs outside the torso and head between keyframes and in mirrored playback', () => {
    for (const a of records) {
      let lowest = Infinity,
        at = 0,
        limb = '';
      for (let t = 0; t <= duration(a.keyframes); t += 0.025) {
        const pose = sample(a.keyframes, t);
        for (const p of [pose, mirrorPose(pose)]) {
          applyPose(rig, p);
          for (const hit of bodyClearance(rig))
            if (hit.gap < lowest) {
              lowest = hit.gap;
              at = t;
              limb = hit.chain;
            }
        }
      }
      expect(lowest, `${a.id} ${limb} at ${at}s`).toBeGreaterThanOrEqual(-0.001);
    }
  }, 30000);
  it('detects a forearm passing into the chest', () => {
    const pose = identity();
    pose.bones.mixamorigLeftArm = [0, 0, -Math.sin(Math.PI / 4), Math.cos(Math.PI / 4)];
    applyPose(rig, pose);
    expect(Math.min(...bodyClearance(rig).map((h) => h.gap))).toBeLessThan(-0.02);
  });
  it('preserves bone lengths and avoids discontinuous knee/wrist jumps', () => {
    for (const a of records) {
      let previous: Vector3[] | undefined;
      for (let t = 0; t <= duration(a.keyframes); t += 0.05) {
        applyPose(rig, sample(a.keyframes, t));
        for (const d of definitions.filter((d) => d.parent))
          expect(endPosition(d.name).distanceTo(endPosition(d.parent!))).toBeCloseTo(
            Math.hypot(...d.position),
            5,
          );
        const points = (['LeftLeg', 'RightLeg', 'LeftHand', 'RightHand'] as const).map((n) =>
          endPosition(`mixamorig${n}`),
        );
        if (previous)
          points.forEach((p, i) =>
            expect(p.distanceTo(previous![i]), `${a.id} jumps at ${t}`).toBeLessThan(0.08),
          );
        previous = points;
      }
    }
  }, 15000);
  it('keeps both wrists planted during the cockerel lift', () => {
    const frames = get('kukkutasana').keyframes;
    const index = frames.findIndex((f) => f.phase === 'final');
    applyPose(rig, frames[index - 1].pose);
    const left = endPosition('mixamorigLeftHand'),
      right = endPosition('mixamorigRightHand');
    for (let t = 0; t <= 1; t += 0.05) {
      applyPose(rig, blendLimbs(frames[index - 1].pose, frames[index].pose, t));
      expect(endPosition('mixamorigLeftHand').distanceTo(left)).toBeLessThan(0.002);
      expect(endPosition('mixamorigRightHand').distanceTo(right)).toBeLessThan(0.002);
    }
  });
  it('keeps the heels fixed and knees extended during the forward fold', () => {
    const frames = get('paschimottanasana').keyframes;
    applyPose(rig, frames[0].pose);
    const heels = [endPosition('mixamorigLeftFoot'), endPosition('mixamorigRightFoot')];
    for (let t = 0; t < duration(frames); t += 0.1) {
      applyPose(rig, sample(frames, t));
      for (const [i, side] of (['Left', 'Right'] as const).entries()) {
        expect(endPosition(`mixamorig${side}Foot`).distanceTo(heels[i])).toBeLessThan(0.002);
        const thigh = endPosition(`mixamorig${side}Leg`).sub(endPosition(`mixamorig${side}UpLeg`));
        const shin = endPosition(`mixamorig${side}Foot`).sub(endPosition(`mixamorig${side}Leg`));
        expect(thigh.angleTo(shin)).toBeLessThan((5 * Math.PI) / 180);
      }
    }
  });
  it('shows soles and palms up in lotus and palms down in both hand balances', () => {
    for (const id of ['padmasana', 'kukkutasana', 'mayurasana']) {
      applyPose(rig, get(id).keyframes.find((f) => f.phase === 'final')!.pose);
      for (const side of ['Left', 'Right'] as const) {
        const palm = new Vector3(0, 0, 1).applyQuaternion(
          rig.bones[`mixamorig${side}Hand`].getWorldQuaternion(new Quaternion()),
        );
        expect(id === 'padmasana' ? palm.y : -palm.y).toBeGreaterThan(0.99);
        if (id === 'padmasana') {
          const sole = new Vector3(0, -1, 0).applyQuaternion(
            rig.bones[`mixamorig${side}Foot`].getWorldQuaternion(new Quaternion()),
          );
          expect(sole.y).toBeGreaterThan(0.99);
        }
      }
    }
  });
  it('settles each folded leg separately before the hands and trunk', () => {
    const a = get('svastikasana');
    const start = a.keyframes[0].pose;
    for (const f of a.keyframes.slice(1, 3)) {
      applyPose(rig, start);
      const ankle = endPosition('mixamorigRightFoot');
      applyPose(rig, f.pose);
      expect(endPosition('mixamorigRightFoot').distanceTo(ankle)).toBeLessThan(0.001);
    }
    const final = a.keyframes.findIndex((f) => f.phase === 'final');
    expect(sample(a.keyframes, frameTime(a.keyframes, final + 1))).toEqual(a.keyframes[final].pose);
  });
});
