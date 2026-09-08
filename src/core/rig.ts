// Original atlas mannequin, MIT. All dimensions are in metres. +Z faces front, +Y is up.
import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  MeshStandardMaterial,
  Quaternion,
  Skeleton,
  SkinnedMesh,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { boneNames, type BoneName } from './bones.ts';
import type { Pose } from './schema.ts';
import { humanGeometry } from './human-geometry.ts';
import type { ModelStyle } from './appearance.ts';
type Definition = { name: BoneName; parent: BoneName | null; position: [number, number, number] };
export const definitions: Definition[] = [
  { name: 'mixamorigHips', parent: null, position: [0, 0.96, 0] },
  { name: 'mixamorigSpine', parent: 'mixamorigHips', position: [0, 0.12, 0] },
  { name: 'mixamorigSpine1', parent: 'mixamorigSpine', position: [0, 0.14, 0] },
  { name: 'mixamorigSpine2', parent: 'mixamorigSpine1', position: [0, 0.14, 0] },
  { name: 'mixamorigNeck', parent: 'mixamorigSpine2', position: [0, 0.15, 0] },
  { name: 'mixamorigHead', parent: 'mixamorigNeck', position: [0, 0.1, 0] },
  ...(['Left', 'Right'] as const).flatMap((side) => {
    const s = side === 'Left' ? 1 : -1;
    return [
      { name: `mixamorig${side}Shoulder`, parent: 'mixamorigSpine2', position: [0.1 * s, 0.07, 0] },
      {
        name: `mixamorig${side}Arm`,
        parent: `mixamorig${side}Shoulder`,
        position: [0.12 * s, 0, 0],
      },
      { name: `mixamorig${side}ForeArm`, parent: `mixamorig${side}Arm`, position: [0, -0.32, 0] },
      { name: `mixamorig${side}Hand`, parent: `mixamorig${side}ForeArm`, position: [0, -0.3, 0] },
      { name: `mixamorig${side}UpLeg`, parent: 'mixamorigHips', position: [0.105 * s, -0.06, 0] },
      { name: `mixamorig${side}Leg`, parent: `mixamorig${side}UpLeg`, position: [0, -0.43, 0] },
      { name: `mixamorig${side}Foot`, parent: `mixamorig${side}Leg`, position: [0, -0.4, 0] },
      {
        name: `mixamorig${side}ToeBase`,
        parent: `mixamorig${side}Foot`,
        position: [0, -0.025, 0.12],
      },
    ] as Definition[];
  }),
];
let sharedGeometry: BufferGeometry | undefined;
let sharedHumanGeometry: BufferGeometry | undefined;
export const rigMaterial = new MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.76,
  metalness: 0.06,
});
export function makeRig(style: ModelStyle = 'reference') {
  const bones = Object.fromEntries(
    definitions.map((d) => {
      const b = new Bone();
      b.name = d.name;
      b.position.fromArray(d.position);
      return [d.name, b];
    }),
  ) as Record<BoneName, Bone>;
  for (const d of definitions) if (d.parent) bones[d.parent].add(bones[d.name]);
  const group = new Group();
  group.add(bones.mixamorigHips);
  group.updateMatrixWorld(true);
  if (!sharedGeometry) {
    const parts: BufferGeometry[] = [];
    function ellipsoid(name: BoneName, offset: number[], scale: number[], color = '#bba68c') {
      const geo = new SphereGeometry(1, 16, 12);
      geo.scale(scale[0], scale[1], scale[2]);
      const p = bones[name].getWorldPosition(new Vector3());
      geo.translate(p.x + offset[0], p.y + offset[1], p.z + offset[2]);
      const count = geo.getAttribute('position').count;
      const indexes = new Uint16Array(count * 4),
        weights = new Float32Array(count * 4),
        colors = new Float32Array(count * 3),
        c = new Color(color);
      for (let i = 0; i < count; i++) {
        indexes[i * 4] = boneNames.indexOf(name);
        weights[i * 4] = 1;
        colors.set(c.toArray(), i * 3);
      }
      geo.setAttribute('skinIndex', new BufferAttribute(indexes, 4));
      geo.setAttribute('skinWeight', new BufferAttribute(weights, 4));
      geo.setAttribute('color', new BufferAttribute(colors, 3));
      parts.push(geo);
    }
    ellipsoid('mixamorigHips', [0, 0, 0], [0.145, 0.115, 0.09], '#58665e');
    ellipsoid('mixamorigSpine', [0, 0.025, 0], [0.112, 0.115, 0.078]);
    ellipsoid('mixamorigSpine1', [0, 0.025, 0], [0.14, 0.12, 0.083]);
    ellipsoid('mixamorigSpine2', [0, 0.035, 0], [0.175, 0.105, 0.085]);
    ellipsoid('mixamorigNeck', [0, 0.04, 0], [0.043, 0.075, 0.043]);
    ellipsoid('mixamorigHead', [0, 0.075, 0.005], [0.095, 0.135, 0.1]);
    ellipsoid('mixamorigHead', [0, 0.063, 0.096], [0.022, 0.027, 0.029]);
    for (const side of ['Left', 'Right'] as const) {
      const color = side === 'Left' ? '#318f95' : '#cb8048';
      const joint = '#354b50';
      ellipsoid(`mixamorig${side}Arm`, [0, 0, 0], [0.049, 0.049, 0.049], joint);
      ellipsoid(`mixamorig${side}Arm`, [0, -0.16, 0], [0.049, 0.145, 0.05], color);
      ellipsoid(`mixamorig${side}ForeArm`, [0, 0, 0], [0.035, 0.035, 0.035], joint);
      ellipsoid(`mixamorig${side}ForeArm`, [0, -0.15, 0], [0.037, 0.135, 0.039], color);
      ellipsoid(`mixamorig${side}Hand`, [0, 0, 0], [0.023, 0.023, 0.023], joint);
      ellipsoid(`mixamorig${side}Hand`, [0, -0.044, 0], [0.035, 0.05, 0.015], color);
      ellipsoid(`mixamorig${side}Hand`, [0, -0.045, 0.014], [0.025, 0.034, 0.004], '#ecd2ae');
      // Separate fingers and thumb make the palm plane and hand direction legible.
      for (let finger = 0; finger < 4; finger++)
        ellipsoid(
          `mixamorig${side}Hand`,
          [(finger - 1.5) * 0.019, -0.099 + Math.abs(finger - 1.5) * 0.008, 0],
          [0.007, 0.035, 0.009],
          color,
        );
      ellipsoid(
        `mixamorig${side}Hand`,
        [side === 'Left' ? -0.043 : 0.043, -0.043, 0.003],
        [0.012, 0.031, 0.012],
        color,
      );
      ellipsoid(`mixamorig${side}UpLeg`, [0, 0, 0], [0.06, 0.06, 0.06], joint);
      ellipsoid(`mixamorig${side}UpLeg`, [0, -0.21, 0], [0.072, 0.192, 0.075], color);
      ellipsoid(`mixamorig${side}Leg`, [0, 0, 0], [0.043, 0.043, 0.043], joint);
      ellipsoid(`mixamorig${side}Leg`, [0, -0.192, 0], [0.048, 0.175, 0.052], color);
      ellipsoid(`mixamorig${side}Foot`, [0, 0, 0], [0.03, 0.03, 0.03], joint);
      ellipsoid(`mixamorig${side}Foot`, [0, -0.011, 0.055], [0.043, 0.029, 0.1], color);
      ellipsoid(`mixamorig${side}Foot`, [0, -0.034, 0.055], [0.042, 0.008, 0.097], joint);
    }
    sharedGeometry = mergeGeometries(parts)!;
    for (const p of parts) p.dispose();
  }
  if (style === 'human' && !sharedHumanGeometry) sharedHumanGeometry = humanGeometry(bones);
  const mesh = new SkinnedMesh(
    style === 'human' ? sharedHumanGeometry! : sharedGeometry,
    rigMaterial,
  );
  mesh.frustumCulled = false;
  group.add(mesh);
  mesh.bind(new Skeleton(boneNames.map((name) => bones[name])));
  return { group, mesh, bones };
}
export type Rig = ReturnType<typeof makeRig>;
/** Set an end effector's world orientation without inheriting unwanted IK roll. */
export function orientWorld(rig: Rig, name: BoneName, world: Quaternion) {
  rig.group.updateMatrixWorld(true);
  rig.bones[name].quaternion
    .copy(rig.bones[name].parent!.getWorldQuaternion(new Quaternion()).invert().multiply(world))
    .normalize();
  rig.group.updateMatrixWorld(true);
}
const qa = new Quaternion(),
  qb = new Quaternion();
export function applyPose(rig: Rig, pose: Pose) {
  for (const name of boneNames) rig.bones[name].quaternion.fromArray(pose.bones[name]!);
  rig.bones.mixamorigHips.position.fromArray(pose.root.position);
  rig.bones.mixamorigHips.quaternion.copy(
    qa.fromArray(pose.root.rotation).multiply(qb.fromArray(pose.bones.mixamorigHips!)),
  );
  rig.group.updateMatrixWorld(true);
}
export function readPose(rig: Rig, original: Pose): Pose {
  return {
    bones: Object.fromEntries(
      boneNames.map((name) => [
        name,
        name === 'mixamorigHips'
          ? qa
              .fromArray(original.root.rotation)
              .invert()
              .multiply(rig.bones[name].quaternion)
              .normalize()
              .toArray()
          : rig.bones[name].quaternion.clone().normalize().toArray(),
      ]),
    ),
    root: {
      position: rig.bones.mixamorigHips.position.toArray(),
      rotation: [...original.root.rotation],
    },
  };
}
// Analytical two-bone IK with a pole vector and reach clamping. Target and pole are world-space.
export function solveTwoBone(
  rig: Rig,
  upper: BoneName,
  lower: BoneName,
  end: BoneName,
  target: Vector3,
  pole: Vector3,
  minBendHeight?: number,
) {
  rig.group.updateMatrixWorld(true);
  const a = rig.bones[upper],
    b = rig.bones[lower],
    c = rig.bones[end];
  const start = a.getWorldPosition(new Vector3()),
    mid = b.getWorldPosition(new Vector3()),
    tip = c.getWorldPosition(new Vector3());
  const l1 = start.distanceTo(mid),
    l2 = mid.distanceTo(tip);
  const direction = target.clone().sub(start);
  if (direction.lengthSq() < 1e-10) direction.set(0, -1, 0);
  direction.normalize();
  const distance = Math.max(
    Math.abs(l1 - l2) + 0.0001,
    Math.min(l1 + l2 - 0.0001, start.distanceTo(target)),
  );
  let bend = pole.clone().sub(start);
  bend.addScaledVector(direction, -bend.dot(direction));
  if (bend.lengthSq() < 1e-8) {
    bend = new Vector3(1, 0, 0);
    if (Math.abs(direction.x) > 0.9) bend.set(0, 0, 1);
    bend.addScaledVector(direction, -bend.dot(direction));
  }
  bend.normalize();
  const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
  const center = start.clone().addScaledVector(direction, along);
  const radius = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  if (minBendHeight !== undefined && center.y + bend.y * radius < minBendHeight) {
    // Restrict the bend circle to the half-space above the floor. This changes
    // the knee pole, never limb length or the requested ankle trajectory.
    const up = new Vector3(0, 1, 0).addScaledVector(direction, -direction.y);
    if (up.lengthSq() > 1e-10 && radius > 1e-8) {
      up.normalize();
      const across = new Vector3().crossVectors(direction, up).normalize();
      const amount = Math.max(-1, Math.min(1, (minBendHeight - center.y) / (radius * up.y)));
      const sign = bend.dot(across) < 0 ? -1 : 1;
      bend
        .copy(up)
        .multiplyScalar(amount)
        .addScaledVector(across, sign * Math.sqrt(1 - amount * amount));
    }
  }
  const elbow = center.addScaledVector(bend, radius);
  const destination = start.clone().addScaledVector(direction, distance);
  function aim(bone: Bone, child: Bone, goal: Vector3) {
    rig.group.updateMatrixWorld(true);
    const world = bone.getWorldQuaternion(new Quaternion());
    const oldDirection = child
      .getWorldPosition(new Vector3())
      .sub(bone.getWorldPosition(new Vector3()))
      .normalize();
    const newDirection = goal.clone().sub(bone.getWorldPosition(new Vector3())).normalize();
    const next = new Quaternion().setFromUnitVectors(oldDirection, newDirection).multiply(world);
    const parentWorld = bone.parent!.getWorldQuaternion(new Quaternion());
    bone.quaternion.copy(parentWorld.invert().multiply(next)).normalize();
  }
  aim(a, b, elbow);
  aim(b, c, destination);
  rig.group.updateMatrixWorld(true);
  return c.getWorldPosition(new Vector3()).distanceTo(target);
}
