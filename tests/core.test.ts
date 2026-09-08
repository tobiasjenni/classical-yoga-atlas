import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import {
  blankFlow,
  blend,
  degrees,
  duration,
  identity,
  mirrorPose,
  sample,
} from '../src/core/motion';
import { asanaSchema, keyframeSchema, quaternionSchema } from '../src/core/schema';
import { makeRig, applyPose, readPose, solveTwoBone } from '../src/core/rig';
describe('motion and authoring', () => {
  it('slerps along the short arc and preserves unit quaternions', () => {
    const a = identity(),
      b = identity();
    b.bones.mixamorigHead = degrees(0, 170, 0);
    const p = blend(a, b, 0.5),
      q = new Quaternion().fromArray(p.bones.mixamorigHead!);
    expect(q.length()).toBeCloseTo(1);
    expect(q.angleTo(new Quaternion())).toBeCloseTo((85 * Math.PI) / 180);
  });
  it('keeps a hold static and returns to neutral', () => {
    const frames = blankFlow();
    frames[3].pose.root.position[0] = 1;
    frames[4].pose = structuredClone(frames[3].pose);
    expect(sample(frames, 9)).toEqual(sample(frames, 11));
    expect(sample(frames, duration(frames))).toEqual(identity());
  });
  it('mirror is an involution including root orientation', () => {
    const p = identity();
    p.root.rotation = degrees(20, 10, 5);
    p.bones.mixamorigLeftArm = degrees(60, 15, 35);
    const m = mirrorPose(mirrorPose(p));
    expect(m).toEqual(p);
  });
  it('solves a reachable two-bone target without changing limb lengths', () => {
    const rig = makeRig();
    applyPose(rig, identity());
    const target = new Vector3(0.38, 1.1, 0.28);
    const length = rig.bones.mixamorigLeftForeArm.position.length();
    const error = solveTwoBone(
      rig,
      'mixamorigLeftArm',
      'mixamorigLeftForeArm',
      'mixamorigLeftHand',
      target,
      new Vector3(0.8, 1, -0.5),
    );
    expect(error).toBeLessThan(0.001);
    expect(rig.bones.mixamorigLeftForeArm.position.length()).toBe(length);
  });
  it('clamps unreachable IK and produces finite quaternions', () => {
    const rig = makeRig();
    applyPose(rig, identity());
    solveTwoBone(
      rig,
      'mixamorigLeftUpLeg',
      'mixamorigLeftLeg',
      'mixamorigLeftFoot',
      new Vector3(100, 0, 0),
      new Vector3(1, 0, 0),
    );
    expect(
      keyframeSchema.safeParse({ ...blankFlow()[0], pose: readPose(rig, identity()) }).success,
    ).toBe(true);
  });
  it('rejects invalid quaternions and incomplete bone maps', () => {
    expect(quaternionSchema.safeParse([0, 0, 0, 0]).success).toBe(false);
    const f = blankFlow()[0];
    delete f.pose.bones.mixamorigHead;
    expect(keyframeSchema.safeParse(f).success).toBe(false);
  });
  it('rejects fabricated attestation without a chapter and verse', () => {
    expect(
      asanaSchema.safeParse({
        id: 'fake',
        provenance: 'attested',
        source: [{ text: 'Unknown', chapter: '', verse: '' }],
      }).success,
    ).toBe(false);
  });
});
