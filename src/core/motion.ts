import { Euler, Quaternion, Vector3 } from 'three';
import { boneNames, type BoneName } from './bones.ts';
import type { Keyframe, Pose } from './schema.ts';
import { locate } from './timeline.ts';
import { applyPose, makeRig, orientWorld, readPose, solveTwoBone } from './rig.ts';
export { duration, frameTime, locate } from './timeline.ts';
export const identity = (): Pose => ({
  bones: Object.fromEntries(boneNames.map((b) => [b, [0, 0, 0, 1]])),
  root: { position: [0, 0.96, 0], rotation: [0, 0, 0, 1] },
});
export const degrees = (x = 0, y = 0, z = 0): [number, number, number, number] =>
  new Quaternion()
    .setFromEuler(new Euler((x * Math.PI) / 180, (y * Math.PI) / 180, (z * Math.PI) / 180))
    .toArray();
export function ease(t: number, mode: Keyframe['easing']) {
  t = Math.max(0, Math.min(t, 1));
  return mode === 'easeInOut'
    ? t * t * (3 - 2 * t)
    : mode === 'easeIn'
      ? t * t
      : mode === 'easeOut'
        ? 1 - (1 - t) ** 2
        : t;
}
export function blend(a: Pose, b: Pose, t: number): Pose {
  const q = new Quaternion();
  const to = new Quaternion();
  return {
    bones: Object.fromEntries(
      boneNames.map((name) => [
        name,
        q.fromArray(a.bones[name]!).slerp(to.fromArray(b.bones[name]!), t).toArray(),
      ]),
    ),
    root: {
      position: new Vector3()
        .fromArray(a.root.position)
        .lerp(new Vector3().fromArray(b.root.position), t)
        .toArray(),
      rotation: q.fromArray(a.root.rotation).slerp(to.fromArray(b.root.rotation), t).toArray(),
    },
  };
}
const chains = (['Left', 'Right'] as const).flatMap((side) =>
  (['arm', 'leg'] as const).map((kind) => ({
    upper: `mixamorig${side}${kind === 'arm' ? 'Arm' : 'UpLeg'}` as BoneName,
    lower: `mixamorig${side}${kind === 'arm' ? 'ForeArm' : 'Leg'}` as BoneName,
    end: `mixamorig${side}${kind === 'arm' ? 'Hand' : 'Foot'}` as BoneName,
  })),
);
let motionRig: ReturnType<typeof makeRig> | undefined;
const landmarks = new WeakMap<
  Pose,
  { start: Vector3; tip: Vector3; pole: Vector3; rotation: Quaternion }[]
>();
function poseLandmarks(pose: Pose) {
  let cached = landmarks.get(pose);
  if (!cached) {
    motionRig ??= makeRig();
    applyPose(motionRig, pose);
    cached = chains.map((c) => ({
      start: motionRig!.bones[c.upper].getWorldPosition(new Vector3()),
      tip: motionRig!.bones[c.end].getWorldPosition(new Vector3()),
      pole: motionRig!.bones[c.lower].getWorldPosition(new Vector3()),
      rotation: motionRig!.bones[c.end].getWorldQuaternion(new Quaternion()),
    }));
    landmarks.set(pose, cached);
  }
  return cached;
}
/** World-space wrist/ankle paths keep planted endpoints fixed as the trunk moves.
 * Joint-space interpolation remains available for user-authored FK flows. */
export function blendLimbs(a: Pose, b: Pose, t: number): Pose {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const from = poseLandmarks(a),
    to = poseLandmarks(b),
    p = blend(a, b, t);
  const rig = motionRig!;
  applyPose(rig, p);
  // Rotate the pelvis around the hip joints. A linear root translation alone
  // moves those offset joints in an arc and pulls a straight leg off its heel.
  const desiredHip = from[1].start
    .clone()
    .lerp(to[1].start, t)
    .add(from[3].start.clone().lerp(to[3].start, t))
    .multiplyScalar(0.5);
  const actualHip = rig.bones.mixamorigLeftUpLeg
    .getWorldPosition(new Vector3())
    .add(rig.bones.mixamorigRightUpLeg.getWorldPosition(new Vector3()))
    .multiplyScalar(0.5);
  rig.bones.mixamorigHips.position.add(desiredHip.sub(actualHip));
  rig.group.updateMatrixWorld(true);
  chains.forEach((c, i) => {
    solveTwoBone(
      rig,
      c.upper,
      c.lower,
      c.end,
      from[i].tip.clone().lerp(to[i].tip, t),
      from[i].pole.clone().lerp(to[i].pole, t),
      c.end.endsWith('Foot') ? 0.075 : undefined,
    );
    orientWorld(rig, c.end, from[i].rotation.clone().slerp(to[i].rotation, t));
  });
  return readPose(rig, p);
}
// Each keyframe duration is the time taken to arrive at its target. A hold repeats the final target.
export function sample(frames: Keyframe[], time: number, stepped = false): Pose {
  if (!frames.length) return identity();
  const { index, progress } = locate(frames, time);
  const path = frames[index].path;
  if (!stepped && path) {
    const at = ease(progress, frames[index].easing) * (path.length - 1),
      i = Math.min(path.length - 2, Math.floor(at));
    return (frames[index].interpolation === 'joint' ? blend : blendLimbs)(
      path[i],
      path[i + 1],
      at - i,
    );
  }
  return stepped
    ? frames[index].pose
    : (frames[index].interpolation === 'limb' ? blendLimbs : blend)(
        frames[Math.max(0, index - 1)].pose,
        frames[index].pose,
        ease(progress, frames[index].easing),
      );
}
export function mirrorPose(pose: Pose): Pose {
  const result = structuredClone(pose);
  for (const name of boneNames) {
    const other = (
      name.includes('Left') ? name.replace('Left', 'Right') : name.replace('Right', 'Left')
    ) as BoneName;
    const q = pose.bones[other]!;
    result.bones[name] = [q[0], -q[1], -q[2], q[3]];
  }
  result.root.position[0] *= -1;
  const q = pose.root.rotation;
  result.root.rotation = [q[0], -q[1], -q[2], q[3]];
  return result;
}
export function blankFlow(): Keyframe[] {
  return (['neutral', 'prep', 'transition', 'final', 'hold', 'exit', 'neutral'] as const).map(
    (phase, i) => ({
      id: `frame-${i + 1}`,
      phase,
      duration: phase === 'hold' ? 5 : 2,
      breath: 'free',
      instruction: `${phase === 'neutral' ? 'Neutral reference position' : `${phase[0].toUpperCase()}${phase.slice(1)}: edit this reconstructed keyframe`}.`,
      easing: 'easeInOut',
      pose: identity(),
      jointsUnderLoad: [],
      provenance: 'unverified',
    }),
  );
}
