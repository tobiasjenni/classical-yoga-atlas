import { Quaternion, Vector3 } from 'three';
import { orientWorld, solveTwoBone, type Rig } from './rig.ts';
import type { BoneName } from './bones.ts';

// Solid torso/head volumes, in each bone's local coordinates. Limb attachments
// are excluded near their own shoulder/hip; distal limbs are never exempted.
export const bodySolids = [
  { bone: 'mixamorigHips', center: [0, 0, 0], radius: [0.145, 0.115, 0.1] },
  { bone: 'mixamorigSpine', center: [0, 0.025, 0], radius: [0.115, 0.115, 0.085] },
  { bone: 'mixamorigSpine1', center: [0, 0.025, 0], radius: [0.145, 0.12, 0.09] },
  { bone: 'mixamorigSpine2', center: [0, 0.035, 0], radius: [0.18, 0.105, 0.09] },
  { bone: 'mixamorigNeck', center: [0, 0.04, 0], radius: [0.045, 0.075, 0.045] },
  { bone: 'mixamorigHead', center: [0, 0.075, 0.005], radius: [0.1, 0.14, 0.105] },
] as const;
export const limbChains = (['Left', 'Right'] as const).flatMap((side) =>
  [true, false].map((arm) => ({
    side,
    arm,
    upper: `mixamorig${side}${arm ? 'Arm' : 'UpLeg'}` as BoneName,
    lower: `mixamorig${side}${arm ? 'ForeArm' : 'Leg'}` as BoneName,
    end: `mixamorig${side}${arm ? 'Hand' : 'Foot'}` as BoneName,
  })),
);
export type Chain = (typeof limbChains)[number];
export function worldSolids(rig: Rig) {
  return bodySolids.map((s) => ({
    center: rig.bones[s.bone].localToWorld(new Vector3(...s.center)),
    inverse: rig.bones[s.bone].getWorldQuaternion(new Quaternion()).invert(),
    radius: new Vector3(...s.radius),
    bone: s.bone,
  }));
}
type Solids = ReturnType<typeof worldSolids>;
export function clearanceAt(point: Vector3, radius: number, solids: Solids) {
  let gap = Infinity,
    obstacle = solids[0];
  for (const solid of solids) {
    const local = point.clone().sub(solid.center).applyQuaternion(solid.inverse);
    const axes = solid.radius.clone().addScalar(radius);
    const scaled = local.clone().divide(axes).length();
    // Signed radial clearance in metres, exact at the tested radial boundary.
    const distance = (scaled - 1) * Math.min(axes.x, axes.y, axes.z);
    if (distance < gap) {
      gap = distance;
      obstacle = solid;
    }
  }
  return { gap, obstacle };
}
export function chainPoints(rig: Rig, chain: Chain) {
  const a = rig.bones[chain.upper].getWorldPosition(new Vector3());
  const b = rig.bones[chain.lower].getWorldPosition(new Vector3());
  const c = rig.bones[chain.end].getWorldPosition(new Vector3());
  const points: { point: Vector3; radius: number; attachment?: boolean }[] = [];
  for (const t of [0.35, 0.5, 0.7, 0.9])
    points.push({
      point: a.clone().lerp(b, t),
      radius: (chain.arm ? 0.049 : 0.072) * Math.sin(Math.PI * t),
      attachment: !chain.arm && t <= 0.5,
    });
  for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1])
    points.push({
      point: b.clone().lerp(c, t),
      radius: chain.arm
        ? 0.023 + 0.015 * Math.sin(Math.PI * t)
        : 0.03 + 0.022 * Math.sin(Math.PI * t),
    });
  for (const offset of chain.arm
    ? [
        [0, -0.045, 0],
        [0, -0.1, 0],
      ]
    : [
        [0, -0.01, 0.055],
        [0, -0.01, 0.12],
      ])
    points.push({
      point: rig.bones[chain.end].localToWorld(new Vector3(...offset)),
      radius: chain.arm ? 0.026 : 0.034,
    });
  return points;
}
export function chainClearance(rig: Rig, chain: Chain, solids = worldSolids(rig)) {
  let worst = { gap: Infinity, point: new Vector3(), obstacle: solids[0], radius: 0 };
  for (const { point, radius, attachment } of chainPoints(rig, chain)) {
    const hit = clearanceAt(
      point,
      radius,
      attachment
        ? solids.filter((s) => s.bone !== 'mixamorigHips' && s.bone !== 'mixamorigSpine')
        : solids,
    );
    if (hit.gap < worst.gap) worst = { ...hit, point, radius };
  }
  return worst;
}
export function bodyClearance(rig: Rig) {
  const solids = worldSolids(rig);
  return limbChains.map((chain) => ({ chain: chain.end, ...chainClearance(rig, chain, solids) }));
}

/** Offline pose correction: first change the elbow/knee's bend plane while
 * retaining the wrist/ankle target. Only an obstructed target moves outward. */
export function clearBody(rig: Rig, previous?: Rig) {
  const solids = worldSolids(rig);
  const floorGap = (chain: Chain) =>
    Math.min(...chainPoints(rig, chain).map((p) => p.point.y - p.radius));
  for (const chain of limbChains) {
    const initial = chainClearance(rig, chain, solids);
    if (initial.gap >= 0 && floorGap(chain) >= 0) continue;
    const target = rig.bones[chain.end].getWorldPosition(new Vector3());
    const rotation = rig.bones[chain.end].getWorldQuaternion(new Quaternion());
    const start = rig.bones[chain.upper].getWorldPosition(new Vector3());
    const pole = rig.bones[chain.lower].getWorldPosition(new Vector3());
    const previousPole = previous?.bones[chain.lower].getWorldPosition(new Vector3()) ?? pole;
    let bestGap = initial.gap;
    let bestScore = Infinity;
    let best = [
      rig.bones[chain.upper].quaternion.clone(),
      rig.bones[chain.lower].quaternion.clone(),
      rig.bones[chain.end].quaternion.clone(),
    ];
    const original = best.map((q) => q.clone());
    // A fixed angular search is deterministic and cheap at authoring time.
    for (let pass = 0; pass < 12; pass++) {
      const axis = target.clone().sub(start).normalize();
      const base = pole.clone().sub(start);
      for (let j = 0; j < 64; j++) {
        rig.bones[chain.upper].quaternion.copy(original[0]);
        rig.bones[chain.lower].quaternion.copy(original[1]);
        rig.bones[chain.end].quaternion.copy(original[2]);
        rig.group.updateMatrixWorld(true);
        const angle = ((j <= 32 ? j : j - 64) * Math.PI) / 32;
        const candidate = base.clone().applyAxisAngle(axis, angle).add(start);
        solveTwoBone(
          rig,
          chain.upper,
          chain.lower,
          chain.end,
          target,
          candidate,
          chain.arm ? 0.055 : 0.085,
        );
        orientWorld(rig, chain.end, rotation);
        const hit = chainClearance(rig, chain, solids);
        const knee = rig.bones[chain.lower].getWorldPosition(new Vector3());
        const gap = Math.min(hit.gap, floorGap(chain));
        const score =
          Math.max(0, 0.003 - gap) * 1000 +
          knee.distanceTo(previousPole) * 2 +
          knee.distanceTo(pole) * 0.2;
        if (score < bestScore) {
          bestScore = score;
          bestGap = gap;
          best = [
            rig.bones[chain.upper].quaternion.clone(),
            rig.bones[chain.lower].quaternion.clone(),
            rig.bones[chain.end].quaternion.clone(),
          ];
        }
      }
      if (bestGap >= 0.001) break;
      // Move a colliding end effector toward the nearest surface, not through it.
      rig.bones[chain.upper].quaternion.copy(best[0]);
      rig.bones[chain.lower].quaternion.copy(best[1]);
      rig.bones[chain.end].quaternion.copy(best[2]);
      rig.group.updateMatrixWorld(true);
      const hit = chainClearance(rig, chain, solids);
      let push = hit.point.clone().sub(hit.obstacle.center);
      if (floorGap(chain) < hit.gap) push.set(0, 1, 0);
      if (push.lengthSq() < 1e-6) push.set(chain.side === 'Left' ? 1 : -1, 0, 1);
      push.normalize();
      target.addScaledVector(push, 0.028);
      target.y = Math.max(chain.arm ? 0.04 : 0.075, target.y);
    }
    rig.bones[chain.upper].quaternion.copy(best[0]);
    rig.bones[chain.lower].quaternion.copy(best[1]);
    rig.bones[chain.end].quaternion.copy(best[2]);
    rig.group.updateMatrixWorld(true);
  }
}
