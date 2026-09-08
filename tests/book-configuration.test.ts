import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { applyPose, makeRig } from '../src/core/rig';
import { poseSchema } from '../src/core/schema';
import book from '../src/data/brahmachari.json';
import models from '../src/data/brahmachari-models.json';

// These assertions encode visible source features, not snapshots of quaternions.
const rig = makeRig();
function set(order: number) {
  const entry = book.entries.find((e) => e.order === order)!;
  applyPose(rig, poseSchema.parse(models.find((m) => m.id === entry.id)!.pose));
}
const point = (name: string) =>
  rig.bones[`mixamorig${name}` as keyof typeof rig.bones].getWorldPosition(new Vector3());

describe('photographed book configurations', () => {
  it.each([28, 35, 36, 39, 40, 52, 55, 59, 81, 82, 83, 84])(
    'preserves the straight legs visible in section %i',
    (order) => {
      set(order);
      for (const side of ['Left', 'Right'])
        expect(point(`${side}UpLeg`).distanceTo(point(`${side}Foot`))).toBeGreaterThan(0.828);
    },
  );
  it.each([3, 5, 21, 25, 48])('grounds both knees in kneeling section %i', (order) => {
    set(order);
    for (const side of ['Left', 'Right']) {
      expect(point(`${side}Leg`).y).toBeLessThan(0.11);
      expect(point(`${side}Leg`).z - point(`${side}Foot`).z).toBeGreaterThan(0.25);
    }
  });
  it.each([17, 51, 91])('keeps the squat knees above the pelvis in section %i', (order) => {
    set(order);
    for (const side of ['Left', 'Right']) {
      expect(point(`${side}Leg`).y - point('Hips').y).toBeGreaterThan(0.24);
      expect(point(`${side}Foot`).y).toBeLessThan(0.15);
    }
  });
  it.each([84, 100])('grounds the forearms, not just a stray fingertip, in section %i', (order) => {
    set(order);
    for (const side of ['Left', 'Right']) {
      expect(point(`${side}ForeArm`).y).toBeLessThan(0.09);
      expect(point(`${side}Hand`).y).toBeLessThan(0.09);
    }
  });
  it('distinguishes straight, shoulder-hooked and nape-bound arm balances', () => {
    set(59);
    expect(point('LeftFoot').x - point('RightFoot').x).toBeGreaterThan(1);
    set(66);
    expect(point('LeftUpLeg').distanceTo(point('LeftFoot'))).toBeGreaterThan(0.828);
    expect(point('RightUpLeg').distanceTo(point('RightFoot'))).toBeLessThan(0.75);
    set(70);
    for (const side of ['Left', 'Right']) {
      expect(point(`${side}Foot`).z).toBeLessThan(point('Head').z - 0.1);
      expect(point(`${side}Leg`).y - point('Hips').y).toBeGreaterThan(0.14);
      expect(point(`${side}UpLeg`).distanceTo(point(`${side}Foot`))).toBeLessThan(0.75);
    }
  });
  it('keeps the prone reaching poses distinct from bent-arm push-ups', () => {
    for (const order of [29, 39]) {
      set(order);
      for (const side of ['Left', 'Right']) {
        expect(point(`${side}Arm`).distanceTo(point(`${side}Hand`))).toBeGreaterThan(0.618);
        expect(point(`${side}Hand`).z - point('Head').z).toBeGreaterThan(0.2);
      }
    }
  });
});
