import { Quaternion, Vector3 } from 'three';
import { makeRig, applyPose, readPose, solveTwoBone, orientWorld } from '../src/core/rig.ts';
import { bodyClearance, clearBody, limbChains } from '../src/core/clearance.ts';
import { blend, blendLimbs } from '../src/core/motion.ts';
import type { Keyframe, Pose } from '../src/core/schema.ts';
const rig = makeRig(),
  previous = makeRig();
const cache = new Map<string, Pose>();
function corrected(p: Pose) {
  const key = JSON.stringify(p);
  let result = cache.get(key);
  if (!result) {
    applyPose(rig, p);
    clearBody(rig);
    result = readPose(rig, p);
    cache.set(key, result);
  }
  return structuredClone(result);
}
export function planClearance(source: Keyframe[]) {
  const frames = source.map((f) => ({ ...f, pose: corrected(f.pose) }));
  for (let index = 1; index < frames.length; index++) {
    const a = frames[index - 1].pose,
      b = frames[index].pose;
    const interpolate = frames[index].interpolation === 'joint' ? blend : blendLimbs;
    const affected = new Set<string>();
    for (let j = 0; j <= 24; j++) {
      applyPose(rig, interpolate(a, b, j / 24));
      for (const hit of bodyClearance(rig)) if (hit.gap < 0) affected.add(hit.chain);
    }
    if (!affected.size) continue;
    let bestPath: Pose[] = [];
    let bestScore = Infinity;
    for (const bulge of [0, 0.1, 0.2, 0.3, 0.4]) {
      const path: Pose[] = [a];
      let minimum = Infinity,
        jump = 0;
      applyPose(previous, a);
      for (let j = 1; j < 40; j++) {
        const t = j / 40,
          p = interpolate(a, b, t);
        applyPose(rig, p);
        for (const chain of limbChains.filter((c) => affected.has(c.end))) {
          const target = rig.bones[chain.end].getWorldPosition(new Vector3());
          const pole = rig.bones[chain.lower].getWorldPosition(new Vector3());
          const rotation = rig.bones[chain.end].getWorldQuaternion(new Quaternion());
          const offset = new Vector3(chain.side === 'Left' ? 1 : -1, 0, 0)
            .applyQuaternion(rig.bones.mixamorigHips.getWorldQuaternion(new Quaternion()))
            .multiplyScalar(Math.sin(Math.PI * t) * bulge);
          // Preserve already-planted endpoints; bend-plane correction handles those.
          applyPose(previous, a);
          const begin = previous.bones[chain.end].getWorldPosition(new Vector3());
          applyPose(previous, b);
          const end = previous.bones[chain.end].getWorldPosition(new Vector3());
          if (begin.distanceTo(end) > 0.04) target.add(offset);
          pole.addScaledVector(offset, 0.5);
          solveTwoBone(
            rig,
            chain.upper,
            chain.lower,
            chain.end,
            target,
            pole,
            chain.arm ? undefined : 0.085,
          );
          orientWorld(rig, chain.end, rotation);
        }
        applyPose(previous, path.at(-1)!);
        clearBody(rig, previous);
        for (const h of bodyClearance(rig)) minimum = Math.min(minimum, h.gap);
        for (const c of limbChains)
          jump = Math.max(
            jump,
            rig.bones[c.lower]
              .getWorldPosition(new Vector3())
              .distanceTo(previous.bones[c.lower].getWorldPosition(new Vector3())),
          );
        path.push(readPose(rig, p));
      }
      applyPose(previous, path.at(-1)!);
      applyPose(rig, b);
      for (const c of limbChains)
        jump = Math.max(
          jump,
          rig.bones[c.lower]
            .getWorldPosition(new Vector3())
            .distanceTo(previous.bones[c.lower].getWorldPosition(new Vector3())),
        );
      path.push(b);
      const score = Math.max(0, -minimum) * 10000 + jump + bulge * 0.02;
      if (score < bestScore) {
        bestScore = score;
        bestPath = path;
      }
      if (minimum >= -0.001 && jump < 0.035) break;
    }
    frames[index].path = bestPath;
  }
  return frames;
}
