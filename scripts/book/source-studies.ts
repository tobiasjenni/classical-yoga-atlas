/** Source-specific static reconstructions. Numbers refer to the EPUB's 108 sections.
 * Contact and bend directions are authored here; a collision optimizer must never
 * silently substitute a different knee/elbow configuration for the photograph. */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { identity, degrees } from '../../src/core/motion.ts';
import type { Pose } from '../../src/core/schema.ts';
import { limb, world, orient, q } from '../seed-poses.ts';
type V = [number, number, number];
type Side = 'Left' | 'Right';
const sides = ['Left', 'Right'] as const;
const clone = (p: Pose) => structuredClone(p);
const v = (p: V) => new Vector3(...p);
function base(y = 0.17, pitch = 0, spine = 0, z = 0) {
  const p = identity();
  p.root.position = [0, y, z];
  p.root.rotation = degrees(pitch);
  for (const b of ['Spine', 'Spine1', 'Spine2'])
    p.bones[`mixamorig${b}` as keyof Pose['bones']] = degrees(spine);
  return p;
}
function at(p: Pose, side: Side, joint: string) {
  return world(p, `mixamorig${side}${joint}` as any);
}
function handRotation(direction: V, normal: V = [0, 1, 0]) {
  const y = v(direction).normalize().negate();
  let z = v(normal).addScaledVector(y, -v(normal).dot(y));
  if (z.lengthSq() < 0.001) z = new Vector3(0, 0, 1).addScaledVector(y, -y.z);
  z.normalize();
  const x = new Vector3().crossVectors(y, z).normalize();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));
}
function arm(p: Pose, s: Side, target: V, pole: V, direction?: V, normal?: V) {
  p = limb(p, s, true, target, pole);
  const d =
    direction ??
    at(p, s, 'Hand')
      .sub(at(p, s, 'ForeArm'))
      .toArray();
  return orient(p, `mixamorig${s}Hand`, handRotation(d, normal));
}
function leg(p: Pose, s: Side, target: V, pole: V, rotation = q(-90)) {
  return limb(p, s, false, target, pole, rotation);
}
function straight(p: Pose, s: Side, armMode: boolean, direction: V, rotation?: Quaternion) {
  if (armMode && v(direction).normalize().y > 0.6)
    p = orient(p, `mixamorig${s}Shoulder`, q(0, 0, s === 'Left' ? 40 : -40));
  const start = at(p, s, armMode ? 'Arm' : 'UpLeg'),
    d = v(direction).normalize();
  const end = start.clone().addScaledVector(d, armMode ? 0.6199 : 0.8299);
  const pole = start
    .clone()
    .addScaledVector(d, 0.3)
    .add(new Vector3(0, 0.005, 0.005));
  if (armMode) return arm(p, s, end.toArray(), pole.toArray(), d.toArray());
  return leg(p, s, end.toArray(), pole.toArray(), rotation);
}
// Exact intersection of thigh and calf spheres with a horizontal knee plane.
// Select the intersection nearest the photographed direction, not an arbitrary IK pole.
function groundLeg(p: Pose, s: Side, end: V, hint: V, rotation = q(), height = 0.085) {
  const hip = at(p, s, 'UpLeg'),
    foot = v(end),
    delta = new Vector3(foot.x - hip.x, 0, foot.z - hip.z);
  const d = delta.length(),
    r1 = Math.sqrt(Math.max(0, 0.43 ** 2 - (height - hip.y) ** 2)),
    r2 = Math.sqrt(Math.max(0, 0.4 ** 2 - (height - foot.y) ** 2));
  let pole = v(hint);
  if (d > 0.001 && d <= r1 + r2 && d >= Math.abs(r1 - r2)) {
    delta.normalize();
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d),
      b = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const mid = new Vector3(hip.x, height, hip.z).addScaledVector(delta, a),
      perp = new Vector3(-delta.z, 0, delta.x);
    const one = mid.clone().addScaledVector(perp, b),
      two = mid.clone().addScaledVector(perp, -b);
    pole = one.distanceTo(v(hint)) < two.distanceTo(v(hint)) ? one : two;
  }
  return leg(p, s, end, pole.toArray(), rotation);
}
function knees(p: Pose, palmsUp = false) {
  for (const s of sides) {
    const target = at(p, s, 'Leg').add(new Vector3(0, 0.065, -0.06));
    p = arm(
      p,
      s,
      target.toArray(),
      [s === 'Left' ? 0.5 : -0.5, 0.35, 0.13],
      [0, 0, 1],
      palmsUp ? [0, 1, 0] : [0, -1, 0],
    );
  }
  return p;
}
function lap(p: Pose) {
  p = arm(
    p,
    'Left',
    [0.055, p.root.position[1] + 0.1, 0.24],
    [0.4, 0.37, 0.08],
    [-1, 0, 0],
    [0, 1, 0],
  );
  return arm(
    p,
    'Right',
    [-0.035, p.root.position[1] + 0.075, 0.24],
    [-0.4, 0.35, 0.08],
    [1, 0, 0],
    [0, 1, 0],
  );
}
function prayer(p: Pose) {
  const c = world(p, 'mixamorigSpine2');
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p = arm(
      p,
      s,
      [sign * 0.025, c.y - 0.12, c.z + 0.24],
      [sign * 0.34, c.y - 0.22, c.z + 0.15],
      [0, 1, 0],
      [-sign, 0, 0],
    );
  }
  return p;
}
function palms(p: Pose, z = 0.2, width = 0.24) {
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p = arm(p, s, [sign * width, 0.035, z], [sign * width, 0.34, z - 0.05], [0, 0, 1], [0, -1, 0]);
  }
  return p;
}
function crossed(l: V = [-0.12, 0.11, 0.3], r: V = [0.12, 0.14, 0.2]) {
  let p = base();
  p = groundLeg(p, 'Left', l, [0.5, 0.085, 0.3], q(0, -80, 55));
  p = groundLeg(p, 'Right', r, [-0.5, 0.085, 0.3], q(0, 80, -55));
  return knees(p, true);
}
function lotus(y = 0.17, pitch = 0) {
  let p = base(y, pitch);
  p = groundLeg(p, 'Left', [0.025, y + 0.025, 0.14], [0.4, 0.085, 0.35], q(180, -80));
  p = groundLeg(p, 'Right', [-0.025, y + 0.06, 0.12], [-0.4, 0.085, 0.35], q(180, 80));
  return knees(p, true);
}
function kneel(y = 0.2, width = 0.13, pitch = 0) {
  let p = base(y, pitch);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    const hip = at(p, s, 'UpLeg'),
      kx = sign * 0.13,
      ky = 0.085;
    const kz =
      hip.z + Math.sqrt(Math.max(0.001, 0.43 ** 2 - (ky - hip.y) ** 2 - (kx - hip.x) ** 2));
    const fz =
      kz - Math.sqrt(Math.max(0.001, 0.4 ** 2 - (0.06 - ky) ** 2 - (sign * width - kx) ** 2));
    p = leg(p, s, [sign * width, 0.06, fz], [kx, ky, kz], q(0, 180));
  }
  return knees(p);
}
function squat(width = 0.17, y = 0.27) {
  let p = base(y);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p = leg(p, s, [sign * 0.1, 0.095, 0.33], [sign * width, 0.65, 0.34], q(35));
  }
  return knees(p);
}
function seatedStraight(spread = 0.01, pitch = 0) {
  let p = base(0.17, pitch);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p = straight(p, s, false, [sign * spread, -0.038, 1], q(-90));
  }
  return p;
}
function graspFeet(p: Pose, sameSide: Side | undefined = undefined) {
  for (const s of sides) {
    const foot = at(p, sameSide ?? s, 'Foot').add(new Vector3(0, 0.035, 0.04));
    p = arm(
      p,
      s,
      foot.toArray(),
      [s === 'Left' ? 0.3 : -0.3, foot.y < 0.25 ? 0.065 : foot.y - 0.2, foot.z - 0.24],
      [0, -1, 0],
      [0, 0, -1],
    );
  }
  return p;
}
function fold(spread = 0.01) {
  let p = seatedStraight(spread, spread > 1 ? 75 : 62);
  p.bones.mixamorigSpine = degrees(6);
  p.bones.mixamorigSpine1 = degrees(6);
  // Restore legs after spinal edits; the root already has its final orientation.
  return graspFeet(p);
}
function overhead(p: Pose, direction: V = [0, 1, 0]) {
  for (const s of sides) p = straight(p, s, true, direction);
  return p;
}
function supine() {
  let p = base(0.13, -90);
  p.bones.mixamorigNeck = degrees(0);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p = straight(p, s, false, [sign * 0.035, -0.015, 1], q(-65, 0, sign * -12));
    p = straight(p, s, true, [sign * 0.13, -0.055, 1]);
  }
  return p;
}
function prone(chest = 0) {
  let p = base(0.13, 90, -chest);
  p.bones.mixamorigNeck = degrees(-25);
  for (const s of sides) p = straight(p, s, false, [0, -0.03, -1], q(0, 180));
  return p;
}
function reclinedKneel() {
  let p = base(0.24, -50, -25);
  p.bones.mixamorigNeck = degrees(-20);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    const hip = at(p, s, 'UpLeg'),
      kz = hip.z + Math.sqrt(0.43 ** 2 - (hip.y - 0.085) ** 2);
    p = leg(p, s, [sign * 0.17, 0.065, kz - 0.397], [sign * 0.13, 0.085, kz], q(0, 180));
    p = arm(p, s, [sign * 0.18, 0.12, 0.22], [sign * 0.35, 0.08, -0.16], [0, 0, 1], [0, 1, 0]);
  }
  return p;
}
function behindHead(p: Pose, both = true) {
  // The ankle lies at the nape, not above the head. Flex the torso to provide
  // the reach for a bent knee beside the shoulder (visible in the source).
  const neck = world(p, 'mixamorigNeck');
  for (const s of both ? sides : (['Left'] as const)) {
    const sign = s === 'Left' ? 1 : -1;
    p = leg(
      p,
      s,
      [sign * 0.18, neck.y + 0.095, neck.z - 0.16],
      [sign * 0.45, neck.y + 0.18, neck.z - 0.12],
      q(-90, -sign * 45),
    );
  }
  return p;
}
function bound(p: Pose) {
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    const f = at(p, s === 'Left' ? 'Right' : 'Left', 'Foot');
    p = arm(
      p,
      s,
      [f.x, f.y + 0.04, f.z - 0.045],
      [sign * 0.34, p.root.position[1] + 0.23, -0.18],
      [sign, 0, 0.2],
      [0, -1, 0],
    );
  }
  return p;
}
function shoulder(plough = false) {
  let p = base(plough ? 0.54 : 0.74, plough ? 215 : 180, plough ? 0 : 0, plough ? 0.12 : 0);
  p.bones.mixamorigNeck = degrees(plough ? 55 : 80);
  for (const s of sides) {
    p = straight(p, s, false, plough ? [0, -0.54, -0.84] : [0, 1, 0], plough ? q() : q(-90));
  }
  return p;
}
function forearmStand(p: Pose) {
  // Triangle of forearms with the wrists behind the crown.
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p = arm(
      p,
      s,
      [sign * 0.045, 0.06, -0.15],
      [sign * 0.27, 0.06, 0.06],
      [sign * -0.25, 0, -1],
      [0, 1, 0],
    );
  }
  return p;
}
function contactArm(p: Pose, s: Side, elbow: V, fingerDirection: V, back = false) {
  const shoulder = at(p, s, 'Arm'),
    e = v(elbow);
  // Pin the elbow to the floor by solving its horizontal distance from shoulder.
  const dy = e.y - shoulder.y,
    horizontal = Math.sqrt(Math.max(0.0001, 0.32 ** 2 - dy * dy));
  const d = new Vector3(e.x - shoulder.x, 0, e.z - shoulder.z).normalize();
  e.copy(shoulder).addScaledVector(d, horizontal);
  e.y = elbow[1];
  const wrist = e.clone().addScaledVector(v(fingerDirection).normalize(), 0.3);
  return arm(p, s, wrist.toArray(), e.toArray(), fingerDirection, back ? [0, 1, 0] : [0, -1, 0]);
}
function groundArm(p: Pose, s: Side, target: V, hint: V, direction: V = [0, 0, 1]) {
  const a = at(p, s, 'Arm'),
    c = v(target),
    h = 0.05;
  const d = new Vector3(c.x - a.x, 0, c.z - a.z),
    length = d.length();
  const ra = Math.sqrt(Math.max(0, 0.32 ** 2 - (h - a.y) ** 2)),
    rb = Math.sqrt(Math.max(0, 0.3 ** 2 - (h - c.y) ** 2));
  if (length < 0.001 || length > ra + rb || length < Math.abs(ra - rb))
    return arm(p, s, target, hint, direction);
  d.normalize();
  const along = (ra * ra - rb * rb + length * length) / (2 * length),
    across = Math.sqrt(Math.max(0, ra * ra - along * along));
  const mid = new Vector3(a.x, h, a.z).addScaledVector(d, along),
    perp = new Vector3(-d.z, 0, d.x);
  const one = mid.clone().addScaledVector(perp, across),
    two = mid.clone().addScaledVector(perp, -across);
  return arm(
    p,
    s,
    target,
    (one.distanceTo(v(hint)) < two.distanceTo(v(hint)) ? one : two).toArray(),
    direction,
    [0, 1, 0],
  );
}
function twist(half = false) {
  let p = crossed();
  p = leg(p, 'Left', [-0.2, 0.065, 0.46], [0.015, 0.57, 0.31], q());
  p.bones.mixamorigSpine = degrees(0, 15);
  p.bones.mixamorigSpine1 = degrees(0, 25);
  p.bones.mixamorigSpine2 = degrees(0, 10);
  p.bones.mixamorigHead = degrees(0, 20);
  p = arm(p, 'Right', [-0.2, 0.13, 0.48], [0.06, 0.4, 0.5], [0, -1, 0]);
  return arm(
    p,
    'Left',
    half ? [0.16, 0.11, -0.15] : [0.12, 0.21, -0.13],
    [0.35, 0.28, -0.2],
    [0, -1, 0],
  );
}
function lifted(p: Pose, _height = 0.28) {
  p.root.position[1] = 0.25;
  p.bones.mixamorigSpine = degrees(25);
  return palms(p, 0.19, 0.25);
}

function wheelStudy() {
  let p = base(0.62, -70);
  p.bones.mixamorigSpine = degrees(-25);
  p.bones.mixamorigSpine1 = degrees(-25);
  p.bones.mixamorigSpine2 = degrees(-20);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p = leg(p, side, [sign * 0.19, 0.07, 0.45], [sign * 0.25, 0.6, 0.4], q());
    p = arm(p, side, [sign * 0.24, 0.035, -0.6], [sign * 0.31, 0.35, -0.6], [0, 0, 1], [0, -1, 0]);
  }
  return p;
}
function deerStudy() {
  let p = base(0.22);
  p = leg(p, 'Left', [0.13, 0.065, 0.57], [0.13, 0.51, 0.3], q());
  p = leg(p, 'Right', [-0.11, 0.17, -0.22], [-0.38, 0.085, 0.13], q(0, 160));
  p = arm(
    p,
    'Left',
    at(p, 'Left', 'Leg')
      .add(new Vector3(0, 0.075, -0.035))
      .toArray(),
    [0.35, 0.52, 0.22],
    [0, 0, 1],
    [0, -1, 0],
  );
  return p;
}
function recliningStudy() {
  let p = base(0.23);
  p.root.rotation = degrees(0, 0, 80);
  p = leg(p, 'Left', [0.84, 0.065, 0], [0.5, 0.1, 0], q(0, 0, -90));
  return leg(p, 'Right', [0.14, 0.075, 0.23], [0.1, 0.085, 0.51], q(0, 90));
}
export function sourceStudies() {
  const p: Record<number, Pose> = {};
  p[1] = lap(crossed([-0.025, 0.1, 0.21], [0.025, 0.16, 0.17]));
  p[2] = lap(lotus());
  p[3] = kneel();
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[3] = arm(p[3], s, [sign * 0.13, 0.09, -0.085], [sign * 0.3, 0.32, -0.13], [0, 0, -1]);
  }
  p[4] = crossed([-0.08, 0.09, 0.29], [0.08, 0.11, 0.17]);
  p[5] = kneel();
  p[6] = crossed();
  p[7] = base(0.29);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[7] = groundLeg(p[7], s, [sign * 0.08, 0.13, -0.02], [sign * 0.5, 0.085, 0.15], q(55));
  }
  p[7] = knees(p[7]);
  p[7].bones.mixamorigNeck = degrees(15);
  p[8] = base(0.21);
  p[8] = leg(p[8], 'Left', [-0.27, 0.065, 0.04], [0.025, 0.16, 0.43], q(0, -90));
  p[8] = leg(p[8], 'Right', [0.27, 0.085, 0.01], [-0.025, 0.28, 0.43], q(0, 90));
  p[8] = arm(p[8], 'Left', [0.035, 0.57, -0.13], [0.19, 1.05, -0.015], [0, -1, 0], [0, 0, 1]);
  p[8] = arm(p[8], 'Right', [0.035, 0.45, -0.135], [-0.33, 0.27, -0.1], [0, 1, 0], [0, 0, -1]);
  p[9] = base(0.54);
  p[9] = leg(p[9], 'Left', [0.12, 0.065, 0.48], [0.12, 0.49, 0.5], q());
  p[9] = straight(p[9], 'Right', false, [0, -0.49, -0.83], q(15));
  p[9] = straight(p[9], 'Left', true, [0, 0, 1]);
  p[9] = arm(p[9], 'Right', [-0.17, 0.63, -0.14], [-0.35, 0.66, -0.15], [0, -1, 0]);
  p[10] = graspFeet(shoulder(true));
  p[11] = supine();
  p[12] = knees(crossed([-0.12, 0.075, 0.04], [0.12, 0.1, 0.075]));
  p[13] = lotus();
  p[13].root.rotation = degrees(-57);
  p[13].bones.mixamorigSpine = degrees(-25);
  p[13].bones.mixamorigSpine1 = degrees(-25);
  p[13].bones.mixamorigSpine2 = degrees(-15);
  p[13].bones.mixamorigNeck = degrees(-35);
  p[13] = groundLeg(p[13], 'Left', [-0.2, 0.19, 0.15], [0.4, 0.085, 0.35], q(180, -80));
  p[13] = groundLeg(p[13], 'Right', [0.2, 0.22, 0.12], [-0.4, 0.085, 0.35], q(180, 80));
  p[13] = graspFeet(p[13]);
  p[14] = twist();
  p[15] = base(0.21);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[15] = groundLeg(
      p[15],
      s,
      [sign * 0.045, 0.14, 0.05],
      [sign * 0.5, 0.085, 0.18],
      q(0, 0, sign * -90),
    );
  }
  p[15] = knees(p[15]);
  p[16] = fold();
  p[17] = prayer(squat(0.17));
  p[18] = base(0.9);
  p[18] = leg(p[18], 'Right', [-0.1, 0.065, 0], [-0.13, 0.49, 0.17], q());
  p[18] = leg(p[18], 'Left', [-0.18, 0.36, -0.1], [0.02, 0.58, 0.26], q(15));
  p[18] = overhead(p[18]);
  p[19] = prone();
  p[19].root.position[1] = 0.43;
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[19] = arm(
      p[19],
      s,
      [sign * 0.14, 0.035, 0.08],
      [sign * 0.1, 0.36, 0.04],
      [0, 0, -1],
      [0, -1, 0],
    );
  }
  p[20] = lifted(lotus(), 0.25);
  p[20] = palms(p[20], 0.24, 0.18);
  p[21] = kneel(0.2, 0.13, 30);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    const c = world(p[21], 'mixamorigSpine');
    p[21] = arm(
      p[21],
      s,
      [sign * 0.08, c.y + 0.04, c.z + 0.15],
      [sign * 0.19, 0.31, -0.1],
      [0, 1, 0],
    );
  }
  p[22] = reclinedKneel();
  p[23] = reclinedKneel();
  for (const s of sides) p[23] = straight(p[23], s, true, [0, -0.025, -1]);
  p[24] = base(1.13, 180);
  for (const s of sides) p[24] = straight(p[24], s, false, [0, 1, -0.06], q(-90));
  p[24] = palms(p[24], 0, 0.22);
  p[25] = kneel(0.2, 0.16, 20);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    const n = world(p[25], 'mixamorigNeck');
    p[25] = arm(
      p[25],
      s,
      [sign * 0.04, n.y - 0.04, n.z - 0.14],
      [sign * 0.51, n.y - 0.05, n.z - 0.06],
      [sign * -1, 0, 0],
    );
  }
  p[26] = base(0.77);
  p[26] = leg(p[26], 'Right', [-0.1, 0.065, 0], [-0.1, 0.48, 0.25], q());
  p[26] = leg(p[26], 'Left', [-0.17, 0.32, -0.1], [0.015, 0.47, 0.3], q(20));
  p[26] = arm(p[26], 'Left', [-0.025, 1.16, 0.29], [0.13, 0.88, 0.35], [0, 1, 0], [-1, 0, 0]);
  p[26] = arm(p[26], 'Right', [0.025, 1.14, 0.3], [-0.05, 0.89, 0.36], [0, 1, 0], [1, 0, 0]);
  p[27] = base(0.24, 60);
  p[27] = groundLeg(p[27], 'Left', [0.16, 0.065, -0.31], [0.22, 0.085, 0.07], q(0, 180));
  p[27] = groundLeg(p[27], 'Right', [0.1, 0.075, 0.015], [-0.38, 0.085, 0.14], q(0, 80));
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[27] = arm(
      p[27],
      s,
      [sign * 0.16, 0.05, 0.82],
      [sign * 0.22, 0.05, 0.51],
      [0, 0, 1],
      [0, -1, 0],
    );
  }
  p[28] = prone();
  for (const s of sides) {
    p[28] = straight(p[28], s, false, [0, 0.39, -1], q(0, 180));
    p[28] = straight(p[28], s, true, [0, -0.02, -1]);
  }
  p[29] = prone();
  for (const s of sides) p[29] = straight(p[29], s, true, [0, -0.045, 1]);
  p[30] = prone(20);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[30] = leg(p[30], s, [sign * 0.16, 0.52, -0.29], [sign * 0.16, 0.16, -0.45], q(-80));
    const f = at(p[30], s, 'Foot');
    p[30] = arm(p[30], s, f.toArray(), [sign * 0.26, 0.38, 0.02], [0, 0, -1], [0, -1, 0]);
  }
  p[31] = prone(26);
  p[31] = palms(p[31], 0.46, 0.23);
  p[32] = lotus(0.17, 77);
  p[32].bones.mixamorigSpine = degrees(12);
  p[32].bones.mixamorigSpine1 = degrees(12);
  p[32] = bound(p[32]);
  // Full wheel arch with palms facing toward the feet.
  p[33] = wheelStudy();
  for (const s of sides)
    p[33] = orient(p[33], `mixamorig${s}Hand`, handRotation([0, 0, 1], [0, -1, 0]));
  p[34] = supine();
  p[34] = leg(p[34], 'Left', [0.13, 0.42, -0.015], [0.13, 0.31, -0.4], q());
  for (const s of sides)
    p[34] = arm(
      p[34],
      s,
      [0.13, 0.36, -0.31],
      [s === 'Left' ? 0.32 : -0.28, 0.26, -0.17],
      [0, 0, -1],
    );
  p[35] = supine();
  p[35].bones.mixamorigSpine = degrees(10);
  p[35].bones.mixamorigSpine1 = degrees(10);
  p[35].bones.mixamorigNeck = degrees(15);
  for (const s of sides) {
    p[35] = straight(p[35], s, false, [0, 0.42, 1], q(-60));
    p[35] = straight(p[35], s, true, [0, 0.16, 1]);
  }
  p[36] = base(0.955, 10, 8);
  p[36] = straight(p[36], 'Right', false, [0, -1, 0], q());
  p[36] = straight(p[36], 'Left', false, [0, 0.2, 1], q(-90));
  p[36] = graspFeet(p[36], 'Left');
  p[37] = bound(lotus());
  p[38] = behindHead(base(0.17, -45, 15));
  p[38] = prayer(p[38]);
  p[39] = prone(10);
  for (const s of sides) {
    p[39] = straight(p[39], s, false, [0, 0.3, -1], q(0, 180));
    p[39] = straight(p[39], s, true, [0, 0.25, 1]);
  }
  p[40] = base(0.67);
  p[40].bones.mixamorigSpine = degrees(0, 0, -35);
  p[40].bones.mixamorigSpine1 = degrees(0, 0, -30);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[40] = straight(p[40], s, false, [sign * 0.68, -0.72, 0], q(0, sign * 75));
  }
  p[40] = straight(p[40], 'Right', true, [0.9, 0.42, 0]);
  p[40] = arm(p[40], 'Left', [0.69, 0.14, 0.02], [0.6, 0.38, 0.02], [0, -1, 0]);
  p[41] = fold(8);
  p[42] = shoulder(true);
  for (const s of sides) p[42] = straight(p[42], s, true, [0, -0.02, 1]);
  p[43] = seatedStraight();
  p[43] = leg(p[43], 'Right', [-0.15, 0.66, 0.15], [-0.55, 0.52, 0.25], q(-90));
  p[43] = graspFeet(p[43]);
  p[44] = base(0.955);
  p[44].bones.mixamorigSpine = degrees(0, 0, 15);
  p[44].bones.mixamorigSpine1 = degrees(0, 0, 20);
  p[44] = overhead(p[44], [-0.57, 0.82, 0]);
  p[45] = base(0.39);
  p[45] = groundLeg(p[45], 'Left', [-0.18, 0.35, 0.02], [0.35, 0.085, 0.2], q(180, -80));
  p[45] = groundLeg(p[45], 'Right', [0.18, 0.37, 0.02], [-0.35, 0.085, 0.2], q(180, 80));
  p[45] = overhead(p[45]);
  p[46] = squat(0.12, 0.29);
  p[46] = leg(p[46], 'Left', [-0.1, 0.44, 0.18], [0.38, 0.19, 0.27], q(180, -75));
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[46] = arm(p[46], s, [sign * 0.16, 0.45, -0.025], [sign * 0.38, 0.48, -0.05], [0, -1, 0]);
  }
  p[47] = lotus();
  p[47].root.rotation = degrees(-65);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    const n = world(p[47], 'mixamorigHead');
    p[47] = arm(
      p[47],
      s,
      [sign * 0.1, n.y + 0.02, n.z + 0.05],
      [sign * 0.22, 0.19, 0.14],
      [0, 1, 0],
      [sign * -1, 0, 0],
    );
  }
  p[48] = kneel(0.16, 0.28);
  p[49] = lifted(lotus());
  p[50] = deerStudy();
  p[50] = arm(p[50], 'Right', [-0.1, 0.76, 0.035], [-0.25, 0.36, 0.13], [0, 1, 0], [1, 0, 0]);
  p[51] = squat(0.13, 0.22);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[51] = arm(p[51], s, [sign * 0.03, 0.53, 0.38], [sign * 0.3, 0.38, 0.39], [sign * -1, 0, 0]);
  }
  p[52] = shoulder();
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[52] = arm(
      p[52],
      s,
      [sign * 0.12, 0.46, 0.13],
      [sign * 0.27, 0.055, 0.04],
      [0, 1, 0],
      [0, 0, -1],
    );
  }
  p[53] = crossed([-0.05, 0.14, 0.11], [0.08, 0.23, 0.12]);
  p[54] = base(0.43, -60, -24);
  p[54].bones.mixamorigNeck = degrees(-35);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[54] = leg(p[54], s, [sign * 0.18, 0.065, 0.49], [sign * 0.23, 0.49, 0.43], q());
  }
  p[54] = palms(p[54], -0.44, 0.26);
  p[55] = base(0.955);
  p[55] = straight(p[55], 'Right', false, [0, -1, 0], q());
  p[55] = straight(p[55], 'Left', false, [0, 0.38, -1], q(0, 180));
  p[55] = straight(p[55], 'Left', true, [0, 1, 0]);
  p[55] = straight(p[55], 'Right', true, [-1, 0, 0]);
  p[56] = base(0.17);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[56] = groundLeg(
      p[56],
      s,
      [sign * 0.045, 0.29, 0.12],
      [sign * 0.5, 0.085, 0.1],
      q(0, 0, sign * -90),
    );
  }
  p[56] = knees(p[56]);
  p[57] = twist(true);
  p[58] = base(0.64, 75, 5);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[58] = leg(p[58], s, [sign * 0.15, 0.53, -0.1], [sign * 0.26, 0.46, 0.4], q(0, 180));
  }
  p[58] = palms(p[58], 0.43, 0.25);
  p[59] = base(0.38, 15);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[59] = straight(p[59], s, false, [sign * 0.6, 0.53, 0.62], q(-90));
  }
  p[59] = palms(p[59], 0.27, 0.24);
  function standingFold() {
    let b = base(0.89, 172);
    b.bones.mixamorigSpine = degrees(5);
    for (const s of sides) b = straight(b, s, false, [0, -1, 0], q());
    return b;
  }
  p[60] = standingFold();
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[60] = arm(
      p[60],
      s,
      [sign * 0.13, 0.37, -0.1],
      [sign * 0.31, 0.19, 0.1],
      [0, 1, 0],
      [0, 0, 1],
    );
  }
  p[61] = lifted(crossed(), 0.27);
  p[62] = lap(crossed());
  p[63] = base(0.17, 78, 6);
  p[63] = straight(p[63], 'Left', false, [0, -0.09, 1], q(-90));
  p[63] = groundLeg(p[63], 'Right', [0.03, 0.11, 0.2], [-0.5, 0.085, 0.2], q(0, 75));
  p[63] = arm(
    p[63],
    'Left',
    at(p[63], 'Left', 'Foot')
      .add(new Vector3(0, 0.04, 0.03))
      .toArray(),
    [0.2, 0.18, 0.6],
    [0, -1, 0],
  );
  p[63] = arm(p[63], 'Right', [-0.12, 0.38, 0.07], [-0.38, 0.43, 0.19], [0, 0, -1]);
  p[64] = standingFold();
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[64] = arm(p[64], s, [sign * 0.12, 0.13, -0.08], [sign * 0.3, 0.2, 0.12], [0, -1, 0]);
  }
  p[65] = shoulder(true);
  p[65] = straight(p[65], 'Right', false, [0, -0.15, -1], q());
  p[65] = arm(p[65], 'Left', at(p[65], 'Left', 'Foot').toArray(), [0.29, 0.17, -0.34], [0, 0, -1]);
  p[65] = straight(p[65], 'Right', true, [0, -0.02, 1]);
  p[66] = base(0.39, 25, 8);
  p[66] = straight(p[66], 'Left', false, [0, -0.12, 1], q(-90));
  p[66] = leg(p[66], 'Right', [-0.27, 0.45, 0.4], [-0.34, 0.67, 0.22], q(-90));
  p[66] = palms(p[66], 0.29, 0.24);
  p[67] = base(0.39, 25, 8);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[67] = leg(p[67], s, [sign * 0.17, 0.48, 0.48], [sign * 0.36, 0.68, 0.25], q(-90));
  }
  p[67] = palms(p[67], 0.29, 0.24);
  p[68] = standingFold();
  p[68] = leg(p[68], 'Left', [0.12, 0.81, -0.1], [0.12, 0.42, -0.1], q(0, 180));
  p[68] = graspFeet(p[68], 'Left');
  p[69] = base(0.53, 145, -17);
  p[69].bones.mixamorigNeck = degrees(-35);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[69] = leg(p[69], s, [sign * 0.08, 0.28, 0.55], [sign * 0.17, 0.91, 0.24], q(0, 180));
    p[69] = straight(p[69], s, true, [sign, -0.03, 0]);
  }
  p[70] = behindHead(base(0.43, 28, 10));
  p[70] = palms(p[70], 0.37, 0.25);
  p[71] = base(0.995);
  for (const s of sides) p[71] = straight(p[71], s, false, [0, -1, 0], q(50));
  p[71] = overhead(p[71]);
  p[72] = base(0.47);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[72] = groundLeg(p[72], s, [sign * 0.38, 0.07, -0.23], [sign * 0.29, 0.085, 0.2], q(0, 180));
    p[72] = straight(p[72], s, true, [sign * 0.8, -0.6, 0]);
  }
  p[73] = crossed();
  p[73].bones.mixamorigSpine = degrees(10);
  p[73].bones.mixamorigSpine1 = degrees(10);
  p[73] = leg(p[73], 'Left', [0.25, 0.68, 0.26], [0.45, 0.46, 0.14], q(-90));
  p[73] = graspFeet(p[73], 'Left');
  p[74] = base(0.18, 15, 12);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[74] = leg(p[74], s, [sign * 0.27, 0.65, 0.38], [sign * 0.4, 0.48, 0.08], q(-90));
  }
  p[74] = graspFeet(p[74]);
  p[75] = base(0.49);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[75] = groundLeg(p[75], s, [sign * 0.15, 0.065, -0.28], [sign * 0.16, 0.085, 0.18], q(0, 180));
    p[75] = arm(
      p[75],
      s,
      [sign * 0.025, 0.65, -0.16],
      [sign * 0.28, 0.68, -0.13],
      [sign * -1, 0, 0],
    );
  }
  p[76] = standingFold();
  p[76] = palms(p[76], 0.1, 0.17);
  p[77] = crossed();
  p[77].root.rotation = degrees(22);
  p[77].bones.mixamorigSpine = degrees(10);
  p[77].bones.mixamorigSpine1 = degrees(10);
  p[77] = behindHead(p[77], false);
  p[77] = prayer(p[77]);
  p[78] = prayer(behindHead(base(0.17, 28, 10)));
  p[79] = base(0.17);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[79] = groundLeg(
      p[79],
      s,
      [sign * 0.035, 0.15, 0.19],
      [sign * 0.5, 0.085, 0.15],
      q(0, 0, sign * -90),
    );
  }
  p[79] = knees(p[79], true);
  p[80] = squat(0.17, 0.3);
  p[80] = groundLeg(p[80], 'Right', [-0.12, 0.13, -0.05], [0.0, 0.085, 0.42], q(55));
  p[80].bones.mixamorigSpine1 = degrees(0, 40);
  p[80].bones.mixamorigHead = degrees(0, 20);
  p[80] = knees(p[80]);
  p[81] = seatedStraight();
  p[81].root.position[1] += 0.22;
  p[81] = palms(p[81], 0.17, 0.25);
  p[82] = base(0.17, -20);
  for (const s of sides) p[82] = straight(p[82], s, false, [0, 0.86, 0.51], q(-60));
  p[82] = graspFeet(p[82]);
  p[83] = seatedStraight(8);
  p[83] = graspFeet(p[83]);
  p[84] = base(0.82, 180);
  for (const s of sides) p[84] = straight(p[84], s, false, [0, 1, 0], q(-90));
  p[84] = forearmStand(p[84]);
  p[85] = supine();
  p[85].bones.mixamorigSpine = degrees(20);
  p[85].bones.mixamorigSpine1 = degrees(20);
  p[85] = behindHead(p[85], false);
  for (const s of sides) p[85] = straight(p[85], s, true, [s === 'Left' ? 0.4 : -0.4, -0.04, 1]);
  p[86] = base(0.955);
  p[86].bones.mixamorigSpine1 = degrees(0, 45);
  p[86].bones.mixamorigHead = degrees(0, 30);
  p[86] = straight(p[86], 'Left', true, [1, 0, 0]);
  p[86] = arm(p[86], 'Right', [0.36, 1.36, 0.15], [0.08, 1.29, 0.43], [1, 0, 0], [0, -1, 0]);
  p[87] = clone(p[15]);
  p[87].bones.mixamorigSpine = degrees(16);
  p[87] = knees(p[87]);
  p[88] = base(0.47, 68, 5);
  p[88] = behindHead(p[88], false);
  p[88] = straight(p[88], 'Right', false, [0, -0.49, -0.87], q(55));
  p[88] = palms(p[88], 0.63, 0.24);
  p[89] = reclinedKneel();
  p[90] = fold(8);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    const n = world(p[90], 'mixamorigNeck');
    p[90] = arm(
      p[90],
      s,
      [sign * 0.035, n.y + 0.12, n.z - 0.05],
      [sign * 0.4, 0.15, 0.47],
      [sign * -1, 0, 0],
    );
  }
  p[91] = squat(0.24, 0.23);
  p[92] = lotus(0.17, 65);
  p[92].root.position[1] += 0.37;
  p[92] = palms(p[92], 0.41, 0.25);
  p[93] = supine();
  p[93] = leg(p[93], 'Left', [0.1, 0.19, -0.56], [0.12, 0.4, -0.19], q(0, 180));
  p[93] = graspFeet(p[93], 'Left');
  p[94] = base(0.55, 215, 0, 0.12);
  p[94].bones.mixamorigNeck = degrees(55);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[94] = groundLeg(p[94], s, [sign * 0.2, 0.065, -0.81], [sign * 0.2, 0.085, -0.41], q(0, 180));
    p[94] = straight(p[94], s, true, [0, -0.02, 1]);
  }
  p[95] = base(0.17, 15, 10);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[95] = leg(p[95], s, [sign * 0.13, 0.62, 0.33], [sign * 0.43, 0.53, 0.02], q(-90, -sign * 45));
  }
  p[95] = graspFeet(p[95]);
  p[96] = base(0.32, 135);
  p[96] = straight(p[96], 'Right', false, [0, -0.35, -1], q(0, 180));
  p[96] = leg(p[96], 'Left', [0.1, 0.105, 0.43], [0.1, 0.16, 0.23], q());
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[96] = arm(
      p[96],
      s,
      [sign * 0.025, 0.62, -0.14],
      [sign * 0.3, 0.43, -0.04],
      [sign * -1, 0, 0],
    );
  }
  p[97] = base(0.925);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[97] = straight(p[97], s, false, [0, -1, sign * 0.2], q());
    p[97] = straight(p[97], s, true, [0, -0.35, sign]);
  }
  p[97].bones.mixamorigNeck = degrees(-10);
  p[98] = kneel();
  p[98].root.rotation = degrees(22);
  p[98].bones.mixamorigSpine = degrees(10);
  p[98].bones.mixamorigSpine1 = degrees(10);
  p[98] = behindHead(p[98], false);
  p[98] = arm(p[98], 'Left', [0.24, 0.3, -0.14], [0.39, 0.39, -0.08], [0, -1, 0]);
  p[98] = arm(p[98], 'Right', [-0.13, 0.1, 0.29], [-0.35, 0.35, 0.15], [0, 0, 1]);
  p[99] = clone(p[15]);
  p[99].bones.mixamorigSpine = degrees(22);
  p[99] = arm(p[99], 'Left', [-0.18, 0.29, 0.2], [0.28, 0.23, 0.31], [-1, 0, 0]);
  p[99] = arm(p[99], 'Right', [0.18, 0.27, 0.2], [-0.28, 0.22, 0.31], [1, 0, 0]);
  p[100] = base(0.97, 175, -4);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[100] = leg(p[100], s, [sign * 0.06, 1.64, 0.1], [sign * 0.1, 1.4, 0.02], q(-90));
  }
  p[100] = forearmStand(p[100]);
  p[101] = recliningStudy();
  p[101] = arm(p[101], 'Left', [-0.57, 0.34, 0.07], [-0.32, 0.055, 0.07], [0, 1, 0], [1, 0, 0]);
  p[102] = lotus();
  p[102].root.rotation = degrees(90);
  p[102].root.position[1] = 0.44;
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[102] = arm(
      p[102],
      s,
      [sign * 0.14, 0.035, 0.08],
      [sign * 0.1, 0.37, 0.05],
      [0, 0, -1],
      [0, -1, 0],
    );
  }
  p[103] = base(0.47, 65);
  p[103].bones.mixamorigSpine1 = degrees(0, 30);
  p[103] = leg(p[103], 'Left', [0.13, 0.07, 0.01], [0.4, 0.6, 0.13], q());
  p[103] = straight(p[103], 'Right', false, [-0.64, -0.47, -0.61], q(0, -45));
  p[103] = palms(p[103], 0.65, 0.24);
  p[104] = base(0.92, 18, 8);
  p[104] = straight(p[104], 'Right', false, [0, -1, 0], q());
  p[104] = behindHead(p[104], false);
  for (const s of sides) p[104] = straight(p[104], s, true, [s === 'Left' ? 1 : -1, 0, 0]);
  p[105] = base(0.57);
  p[105] = leg(p[105], 'Right', [-0.11, 0.1, 0.2], [-0.11, 0.45, 0.38], q(40));
  p[105] = groundLeg(p[105], 'Left', [-0.13, 0.53, 0.19], [0.22, 0.085, 0.23], q(180, -70));
  p[105] = prayer(p[105]);
  p[106] = base(0.94, 60, -5);
  p[106] = straight(p[106], 'Right', false, [0, -1, 0], q());
  p[106] = leg(p[106], 'Left', [0.12, 1.65, -0.34], [0.12, 1.2, -0.63], q(-90));
  p[106] = arm(p[106], 'Left', at(p[106], 'Left', 'Foot').toArray(), [0.13, 1.4, -0.02], [0, 1, 0]);
  p[106] = straight(p[106], 'Right', true, [0, 0.12, 1]);
  p[107] = knees(lotus());
  p[107].bones.mixamorigNeck = degrees(25);
  p[108] = base(0.7);
  p[108] = leg(p[108], 'Right', [-0.1, 0.075, 0], [-0.1, 0.4, 0.3], q(35));
  p[108] = leg(p[108], 'Left', [0.12, 0.42, 0.49], [0.12, 0.75, 0.51], q(25));
  p[108] = arm(p[108], 'Left', [-0.18, 1.15, 0.41], [0.34, 1.16, 0.3], [0, 1, 0], [0, 0, 1]);
  p[108] = arm(p[108], 'Right', [0.36, 1.13, 0.4], [-0.08, 1.1, 0.46], [0, -1, 0], [0, 0, 1]);
  // Explicit support and close-contact configurations.
  // A normal standing rig cannot keep folded legs when its root is pitched;
  // re-solve those legs in world space after every torso change.
  for (const n of [12, 15, 53, 56, 87, 99]) {
    const height = n === 56 ? 0.28 : n === 53 ? 0.19 : 0.14;
    let b = base(n === 15 || n === 87 || n === 99 ? 0.21 : 0.17);
    for (const s of sides) {
      const sign = s === 'Left' ? 1 : -1;
      b = groundLeg(
        b,
        s,
        [sign * 0.035, height, n === 12 ? 0.16 : 0.19],
        [sign * 0.5, 0.085, 0.16],
        q(0, 0, sign * -90),
      );
    }
    if (n === 87 || n === 99) b.bones.mixamorigSpine = degrees(n === 99 ? 22 : 12);
    b = knees(b, n === 56 || n === 87);
    if (n === 99) {
      b = arm(b, 'Left', [-0.18, 0.29, 0.25], [0.3, 0.24, 0.3], [-1, 0, 0]);
      b = arm(b, 'Right', [0.18, 0.25, 0.25], [-0.3, 0.2, 0.3], [1, 0, 0]);
    }
    p[n] = b;
  }
  p[8] = arm(p[8], 'Left', [0.075, 0.69, -0.12], [0.22, 1.05, 0], [0, -1, 0], [0, 0, 1]);
  p[8] = arm(p[8], 'Right', [0.075, 0.57, -0.13], [-0.31, 0.38, -0.17], [0, 1, 0], [0, 0, -1]);
  p[13] = base(0.28, -50, -22);
  p[13].bones.mixamorigNeck = degrees(-20);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[13] = groundLeg(
      p[13],
      s,
      [sign * 0.025, 0.21, 0.19],
      [sign * 0.44, 0.085, 0.3],
      q(180, sign * -80),
    );
  }
  p[13] = graspFeet(p[13]);
  for (const n of [10, 42, 65]) {
    let b = base(0.47, 180, 30);
    b = orient(b, 'mixamorigNeck', q(-90));
    b.bones.mixamorigHead = degrees(0);
    for (const s of sides) b = straight(b, s, false, [0, -0.56, -0.83], q());
    if (n === 65) b = straight(b, 'Right', false, [0, -0.2, -1], q());
    for (const s of sides) {
      if (n === 10 || (n === 65 && s === 'Left')) {
        const f = at(b, s, 'Foot');
        b = arm(
          b,
          s,
          f.toArray(),
          [s === 'Left' ? 0.22 : -0.22, 0.06, -0.32],
          [0, 0, -1],
          [0, 1, 0],
        );
      } else b = straight(b, s, true, [0, -0.03, 1]);
    }
    p[n] = b;
  }
  for (const n of [16, 63]) {
    const s = 'Left';
    const f = at(p[n], s, 'Foot');
    p[n] = arm(p[n], s, [f.x, 0.13, f.z], [0.3, 0.06, 0.56], [0, 0, 1], [0, 1, 0]);
    if (n === 16) {
      const r = at(p[n], 'Right', 'Foot');
      p[n] = arm(p[n], 'Right', [-0.11, 0.13, r.z], [-0.3, 0.06, 0.56], [0, 0, 1], [0, 1, 0]);
    }
  }
  for (const n of [18, 44, 71]) {
    const direction: V = n === 44 ? [-0.55, 0.835, 0] : [0, 1, 0];
    for (const s of sides) {
      const sign = s === 'Left' ? 1 : -1;
      const a = at(p[n], s, 'Arm');
      const d = v(direction);
      d.x -= sign * 0.26;
      d.normalize();
      p[n] = straight(p[n], s, true, d.toArray());
    }
  }
  p[17] = squat(0.17, 0.23);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[17] = arm(
      p[17],
      s,
      [sign * 0.045, 0.71, 0.38],
      [sign * 0.16, 0.54, 0.35],
      [sign * -1, 0, 0],
      [0, -1, 0],
    );
  }
  for (const n of [20, 49, 61]) {
    let b = base(0.245, 0, 8);
    for (const s of sides) {
      const sign = s === 'Left' ? 1 : -1;
      b = leg(b, s, [sign * 0.025, 0.36, 0.15], [sign * 0.45, 0.3, 0.31], q(180, sign * -80));
    }
    p[n] = palms(b, 0.22, n === 20 ? 0.18 : 0.27);
  }
  p[27] = base(0.2, 70);
  p[27] = groundLeg(p[27], 'Left', [0.15, 0.065, -0.3], [0.22, 0.085, 0.05], q(0, 180));
  p[27] = groundLeg(p[27], 'Right', [0.1, 0.075, 0.14], [-0.4, 0.085, 0.15], q(0, 80));
  for (const s of sides)
    p[27] = contactArm(p[27], s, [s === 'Left' ? 0.22 : -0.22, 0.05, 0.48], [0, 0, 1]);
  p[31] = prone(31);
  for (const s of sides) {
    const a = at(p[31], s, 'Arm');
    const dy = 0.035 - a.y;
    const dz = Math.sqrt(Math.max(0.001, 0.6199 ** 2 - dy * dy));
    p[31] = arm(p[31], s, [a.x, 0.035, a.z + dz], [a.x, 0.3, a.z + 0.1], [0, 0, 1], [0, -1, 0]);
  }
  p[36] = base(0.955, 16, 9);
  p[36] = straight(p[36], 'Right', false, [0, -1, 0], q());
  p[36] = straight(p[36], 'Left', false, [0, 0.4, 1], q(-90));
  p[36] = graspFeet(p[36], 'Left');
  p[38] = base(0.17, -83, 0);
  p[38] = behindHead(p[38]);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[38] = arm(p[38], s, [sign * 0.035, 0.1, 0.2], [sign * 0.34, 0.065, -0.05], [sign * -1, 0, 0]);
  }
  p[43] = seatedStraight();
  p[43] = leg(p[43], 'Right', [-0.15, 0.66, 0.16], [-0.58, 0.63, 0.05], q(-90));
  p[43] = arm(p[43], 'Right', [-0.15, 0.69, 0.16], [-0.56, 0.73, 0.02], [0, 0, -1]);
  p[43] = arm(p[43], 'Left', [0.11, 0.15, 0.82], [0.25, 0.35, 0.52], [0, 0, 1]);
  p[45] = base(0.4);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[45] = groundLeg(
      p[45],
      s,
      [sign * 0.025, 0.35, 0.01],
      [sign * 0.3, 0.085, 0.2],
      q(180, sign * -80),
    );
  }
  p[45] = prayer(p[45]);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[45] = arm(
      p[45],
      s,
      [sign * 0.025, 1.38, 0.02],
      [sign * 0.33, 1.16, 0.04],
      [0, 1, 0],
      [-sign, 0, 0],
    );
  }
  p[47] = base(0.17, -12, 4);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[47] = leg(p[47], s, [sign * 0.025, 0.38, 0.13], [sign * 0.45, 0.5, 0.2], q(180, sign * -80));
    const h = world(p[47], 'mixamorigHead');
    p[47] = arm(
      p[47],
      s,
      [sign * 0.09, h.y + 0.025, h.z + 0.045],
      [sign * 0.2, 0.25, 0.2],
      [0, 1, 0],
      [-sign, 0, 0],
    );
  }
  p[50] = arm(p[50], 'Right', [-0.1, 0.75, 0.035], [-0.27, 0.38, 0.1], [0, 1, 0], [1, 0, 0]);
  p[50].bones.mixamorigHead = degrees(0, 0, 12);
  p[51] = squat(0.13, 0.2);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[51] = arm(p[51], s, [sign * 0.035, 0.48, 0.49], [sign * 0.28, 0.37, 0.45], [-sign, 0, 0]);
  }
  p[52] = base(0.74, 180);
  p[52] = orient(p[52], 'mixamorigNeck', q(-90));
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[52] = straight(p[52], s, false, [0, 1, 0], q(-90));
    p[52] = arm(
      p[52],
      s,
      [sign * 0.12, 0.51, 0.13],
      [sign * 0.2, 0.06, 0.05],
      [0, 1, 0],
      [0, 0, -1],
    );
  }
  p[58] = base(0.7, 108, -5);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[58] = leg(p[58], s, [sign * 0.13, 0.65, -0.08], [sign * 0.24, 0.5, 0.38], q(0, 180));
  }
  p[58] = palms(p[58], 0.43, 0.25);
  p[59] = base(0.24, 20, 8);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[59] = straight(p[59], s, false, [sign * 0.57, 0.67, 0.48], q(-60));
  }
  p[59] = palms(p[59], 0.27, 0.24);
  for (const n of [60, 64, 68, 76]) {
    // Give the torso physical room in front of the shins. An exact 180-degree
    // fold embeds the chest and face in the legs on this rig.
    const feetBefore = sides.map((s) => at(p[n], s, 'Foot').toArray());
    p[n].root.rotation = degrees(156);
    p[n].bones.mixamorigSpine = degrees(0);
    for (let i = 0; i < 2; i++) {
      const s = sides[i];
      if (n === 68 && s === 'Left') continue;
      p[n] = straight(p[n], s, false, [0, -1, 0], q());
    }
    if (n === 68) {
      p[n] = leg(p[n], 'Left', [0.12, 0.81, -0.12], [0.12, 0.43, -0.14], q(0, 180));
      p[n] = graspFeet(p[n], 'Left');
    } else if (n === 76) p[n] = palms(p[n], 0.14, 0.18);
    else
      for (const s of sides) {
        const sign = s === 'Left' ? 1 : -1;
        p[n] = arm(
          p[n],
          s,
          [sign * 0.14, n === 60 ? 0.35 : 0.12, -0.04],
          [sign * 0.32, 0.21, 0.15],
          [0, n === 60 ? 1 : -1, 0],
        );
      }
  }
  for (const n of [66, 67]) {
    p[n].root.position[1] = 0.27;
    for (const s of sides) {
      const sign = s === 'Left' ? 1 : -1;
      if (n === 66 && s === 'Left') p[n] = straight(p[n], s, false, [0, 0, 1], q(-90));
      else p[n] = leg(p[n], s, [sign * 0.21, 0.66, 0.45], [sign * 0.32, 0.63, 0.1], q(-90));
    }
    p[n] = palms(p[n], 0.29, 0.24);
  }
  for (const n of [70, 77, 78, 98, 104]) {
    let b = base(n === 104 ? 0.94 : n === 70 ? 0.3 : 0.17, 44, 12);
    b.bones.mixamorigNeck = degrees(-65);
    b = behindHead(b, n === 70 || n === 78);
    if (n === 77) b = groundLeg(b, 'Right', [0.1, 0.1, 0.2], [-0.43, 0.085, 0.25], q(0, 80));
    if (n === 98) {
      const hip = at(b, 'Right', 'UpLeg');
      const kz = hip.z + Math.sqrt(0.43 ** 2 - (hip.y - 0.085) ** 2);
      b = leg(b, 'Right', [-0.13, 0.065, kz - 0.399], [-0.13, 0.085, kz], q(0, 180));
    }
    if (n === 104) {
      b = straight(b, 'Right', false, [0, -1, 0], q());
      for (const s of sides) b = straight(b, s, true, [s === 'Left' ? 1 : -1, 0, 0]);
    } else if (n === 70) b = palms(b, 0.4, 0.25);
    else if (n === 98) {
      b = arm(b, 'Left', [0.24, 0.3, -0.1], [0.4, 0.34, -0.08], [0, -1, 0]);
      b = arm(b, 'Right', [-0.13, 0.12, 0.27], [-0.34, 0.35, 0.15], [0, 0, 1]);
    } else b = prayer(b);
    p[n] = b;
  }
  for (const n of [73, 74, 95]) {
    let b = base(0.17, 35, 10);
    b.bones.mixamorigNeck = degrees(-45);
    if (n === 73) b = groundLeg(b, 'Right', [0.1, 0.1, 0.2], [-0.45, 0.085, 0.2], q(0, 80));
    for (const s of n === 73 ? (['Left'] as const) : sides) {
      const sign = s === 'Left' ? 1 : -1;
      b = leg(
        b,
        s,
        [sign * (n === 95 ? 0.14 : 0.25), 0.61, 0.43],
        [sign * 0.43, 0.46, 0.05],
        q(-90, 0, n === 95 ? sign * 80 : 0),
      );
      b = arm(
        b,
        s,
        [sign * (n === 95 ? 0.14 : 0.25), 0.63, 0.44],
        [sign * 0.33, 0.28, 0.3],
        [0, 1, 0],
        [0, 0, -1],
      );
    }
    if (n === 73) b = straight(b, 'Right', true, [-0.1, 0.65, 0.76]);
    p[n] = b;
  }
  p[80] = squat(0.2, 0.23);
  p[80] = groundLeg(p[80], 'Right', [-0.1, 0.15, 0.05], [0.0, 0.085, 0.43], q(55));
  p[80].bones.mixamorigSpine1 = degrees(0, 40);
  p[80].bones.mixamorigHead = degrees(0, 25);
  p[80] = knees(p[80]);
  p[81] = seatedStraight();
  p[81].root.position[1] = 0.21;
  p[81] = palms(p[81], 0.17, 0.25);
  p[84] = base(0.86, 180);
  for (const s of sides) p[84] = straight(p[84], s, false, [0, 1, 0], q(-90));
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[84] = contactArm(p[84], s, [sign * 0.28, 0.055, 0.04], [-sign * 0.55, 0, -0.84], true);
  }
  p[88] = base(0.53, 80, 0);
  p[88].bones.mixamorigNeck = degrees(-35);
  p[88] = behindHead(p[88], false);
  p[88] = straight(p[88], 'Right', false, [0, -0.58, -0.81], q(55));
  p[88] = palms(p[88], 0.64, 0.24);
  p[92] = base(0.68, 110, -5);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[92] = leg(p[92], s, [-sign * 0.1, 0.64, 0.02], [sign * 0.38, 0.58, 0.3], q(180, sign * -80));
  }
  p[92] = palms(p[92], 0.43, 0.25);
  p[94] = base(0.42, 180, 40);
  p[94] = orient(p[94], 'mixamorigNeck', q(-125));
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[94] = groundLeg(
      p[94],
      s,
      [sign * 0.16, 0.075, -0.61],
      [sign * 0.18, 0.085, -0.24],
      q(0, 180),
    );
    p[94] = straight(p[94], s, true, [0, -0.1, 1]);
  }
  p[96] = base(0.27, 110, 15);
  p[96].bones.mixamorigNeck = degrees(0);
  p[96] = straight(p[96], 'Right', false, [0, -0.2, -1], q(0, 180));
  p[96] = leg(p[96], 'Left', [0.105, 0.07, 0.4], [0.1, 0.21, 0.06], q());
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[96] = arm(p[96], s, [sign * 0.03, 0.54, 0.03], [sign * 0.3, 0.45, 0.23], [-sign, 0, 0]);
  }
  p[100] = base(0.88, 180);
  p[100].bones.mixamorigNeck = degrees(-45);
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[100] = leg(p[100], s, [sign * 0.035, 1.71, 0.12], [sign * 0.11, 1.32, -0.1], q(-90));
    p[100] = contactArm(p[100], s, [sign * 0.25, 0.055, 0.05], [0, 0, 0.999]);
  }
  p[102] = lotus();
  p[102].root.rotation = degrees(90);
  p[102].root.position[1] = 0.44;
  for (const s of sides) {
    const sign = s === 'Left' ? 1 : -1;
    p[102] = leg(
      p[102],
      s,
      [sign * 0.025, 0.47, -0.12],
      [sign * 0.43, 0.43, -0.28],
      q(0, sign * -80),
    );
    p[102] = arm(
      p[102],
      s,
      [sign * 0.14, 0.035, 0.08],
      [sign * 0.1, 0.36, 0.04],
      [0, 0, -1],
      [0, -1, 0],
    );
  }
  // Source-specific contact refinements.
  p[8] = orient(p[8], 'mixamorigLeftShoulder', q(0, 0, 50));
  p[8] = arm(p[8], 'Left', [0.055, 0.75, -0.13], [0.2, 1.15, 0], [0, -1, 0], [0, 0, 1]);
  p[8] = arm(p[8], 'Right', [0.055, 0.63, -0.135], [-0.3, 0.4, -0.14], [0, 1, 0], [0, 0, -1]);
  p[13] = base(0.24, -50, -25);
  p[13].bones.mixamorigNeck = degrees(-20);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[13] = groundLeg(
      p[13],
      side,
      [sign * 0.025, 0.19, 0.2],
      [sign * 0.42, 0.085, 0.28],
      q(180, sign * -80),
    );
    p[13] = arm(
      p[13],
      side,
      [sign * 0.2, 0.2, 0.17],
      [sign * 0.36, 0.14, -0.04],
      [-sign, 0, 0],
      [0, -1, 0],
    );
  }
  p[21] = kneel(0.2, 0.13, 30);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[21] = arm(p[21], side, [sign * 0.085, 0.32, 0.25], [sign * 0.21, 0.26, -0.05], [0, 0, -1]);
  }
  for (const n of [32, 37]) {
    let b = base(n === 32 ? 0.21 : 0.17, n === 32 ? 68 : 0, n === 32 ? 12 : 0);
    for (const side of sides) {
      const sign = side === 'Left' ? 1 : -1;
      b = groundLeg(
        b,
        side,
        [sign * 0.07, 0.17, 0.18],
        [sign * 0.44, 0.085, 0.3],
        q(180, sign * -80),
      );
      b = arm(
        b,
        side,
        [sign * 0.2, 0.21, 0.12],
        [sign * 0.34, 0.35, -0.17],
        [-sign, 0, 0],
        [0, -1, 0],
      );
    }
    p[n] = b;
  }
  p[34] = supine();
  p[34] = leg(p[34], 'Left', [0.24, 0.44, -0.015], [0.27, 0.34, -0.38], q());
  for (const side of sides)
    p[34] = arm(
      p[34],
      side,
      [0.23, 0.37, -0.3],
      [side === 'Left' ? 0.38 : -0.25, 0.28, -0.16],
      [0, 0, -1],
    );
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[38] = arm(p[38], side, [sign * 0.035, 0.22, 0.12], [sign * 0.32, 0.1, -0.06], [-sign, 0, 0]);
  }
  p[45] = base(0.41);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[45] = groundLeg(
      p[45],
      side,
      [sign * 0.14, 0.32, -0.13],
      [sign * 0.3, 0.085, 0.19],
      q(180, sign * -80),
    );
    p[45] = arm(
      p[45],
      side,
      [sign * 0.025, 1.4, 0.02],
      [sign * 0.34, 1.18, 0.04],
      [0, 1, 0],
      [-sign, 0, 0],
    );
  }
  p[47] = base(0.17, -25);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[47] = leg(
      p[47],
      side,
      [sign * 0.025, 0.5, 0.3],
      [sign * 0.43, 0.53, 0.15],
      q(180, sign * -80),
    );
    const h = world(p[47], 'mixamorigHead');
    p[47] = arm(
      p[47],
      side,
      [sign * 0.125, h.y + 0.025, h.z + 0.055],
      [sign * 0.21, 0.34, 0.19],
      [0, 1, 0],
      [-sign, 0, 0],
    );
  }
  p[50] = arm(p[50], 'Right', [-0.145, 0.84, 0.045], [-0.31, 0.39, 0.18], [0, 1, 0], [1, 0, 0]);
  p[53] = base(0.17);
  p[53] = groundLeg(p[53], 'Left', [0.065, 0.13, 0.19], [0.43, 0.085, 0.2], q(0, 0, -90));
  p[53] = groundLeg(p[53], 'Right', [-0.065, 0.23, 0.2], [-0.43, 0.085, 0.2], q(180, 75));
  p[53] = knees(p[53]);
  p[61] = base(0.245, 0, 8);
  p[61] = leg(p[61], 'Left', [-0.1, 0.29, 0.3], [0.45, 0.31, 0.2], q(0, -80, 55));
  p[61] = leg(p[61], 'Right', [0.1, 0.33, 0.2], [-0.45, 0.31, 0.2], q(0, 80, -55));
  p[61] = palms(p[61], 0.22, 0.27);
  p[63] = base(0.17, 62, 6);
  p[63] = straight(p[63], 'Left', false, [0, -0.06, 1], q(-90));
  p[63] = groundLeg(p[63], 'Right', [0.04, 0.11, 0.2], [-0.43, 0.085, 0.25], q(0, 80));
  p[63] = arm(p[63], 'Left', [0.11, 0.15, 0.82], [0.25, 0.1, 0.55], [0, 0, 1]);
  p[63] = arm(p[63], 'Right', [-0.18, 0.43, 0.1], [-0.34, 0.43, 0.18], [0, 0, -1]);
  p[68] = base(0.89, 156);
  p[68] = straight(p[68], 'Right', false, [0, -1, 0], q());
  p[68] = leg(p[68], 'Left', [0.23, 0.9, -0.18], [0.26, 0.55, -0.4], q(0, 180));
  for (const side of sides)
    p[68] = arm(
      p[68],
      side,
      [0.23, 0.9, -0.18],
      [side === 'Left' ? 0.37 : -0.26, 0.64, -0.09],
      [0, 0, -1],
    );
  p[92] = base(0.69, 108, -5);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[92] = leg(
      p[92],
      side,
      [sign * 0.12, 0.72, -0.17],
      [sign * 0.3, 0.48, 0.29],
      q(0, sign * -70),
    );
  }
  p[92] = palms(p[92], 0.43, 0.25);
  p[93] = supine();
  p[93] = leg(p[93], 'Left', [0.13, 0.25, -0.53], [0.17, 0.45, -0.15], q(0, 180));
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[93] = arm(
      p[93],
      side,
      [0.13 + sign * 0.035, 0.28, -0.5],
      [sign * 0.3, 0.27, -0.27],
      [0, 0, -1],
    );
  }
  p[96] = base(0.48, 125);
  p[96].bones.mixamorigNeck = degrees(15);
  p[96] = straight(p[96], 'Right', false, [0, -0.5, -0.87], q(0, 180));
  p[96] = leg(p[96], 'Left', [0.23, 0.07, 0.55], [0.25, 0.45, 0.5], q());
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[96] = arm(p[96], side, [sign * 0.025, 0.73, 0.05], [sign * 0.3, 0.63, 0.23], [-sign, 0, 0]);
  }
  p[101] = recliningStudy();
  p[101] = arm(p[101], 'Left', [-0.6, 0.39, 0.12], [-0.39, 0.055, 0.25], [0, 1, 0], [1, 0, 0]);
  p[101] = arm(p[101], 'Right', [0.48, 0.18, 0.18], [-0.01, 0.36, 0.24], [1, 0, 0]);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[102] = leg(
      p[102],
      side,
      [sign * 0.06, 0.53, -0.16],
      [sign * 0.43, 0.45, -0.26],
      q(0, sign * -80),
    );
  }
  p[108] = arm(p[108], 'Right', [0.36, 1.13, 0.4], [-0.12, 1.07, 0.48], [0, -1, 0], [0, 0, 1]);
  for (const n of [10, 65])
    for (const side of n === 65 ? (['Left'] as const) : sides) {
      const sign = side === 'Left' ? 1 : -1;
      const f = at(p[n], side, 'Foot');
      p[n] = groundArm(p[n], side, f.toArray(), [sign * 0.28, 0.05, -0.36], [0, 0, -1]);
    }
  // Keep side-bending shoulder elevation in the torso's frame.
  p[44] = base(0.955);
  p[44].bones.mixamorigSpine = degrees(0, 0, 15);
  p[44].bones.mixamorigSpine1 = degrees(0, 0, 20);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    const a = at(p[44], side, 'Arm'),
      d = v([-0.55 - sign * 0.23, 0.835, 0]).normalize();
    p[44] = arm(
      p[44],
      side,
      a.clone().addScaledVector(d, 0.6199).toArray(),
      a.clone().addScaledVector(d, 0.3).toArray(),
      d.toArray(),
    );
  }
  for (const n of [13, 22, 23, 89]) p[n] = orient(p[n], 'mixamorigNeck', q(-125));
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[21] = orient(p[21], `mixamorig${side}Hand`, handRotation([0, -1, 0], [0, 0, -1]));
    p[38] = arm(p[38], side, [sign * 0.035, 0.35, 0.12], [sign * 0.34, 0.25, -0.06], [-sign, 0, 0]);
    p[69] = orient(p[69], `mixamorig${side}Foot`, q(-90));
  }
  p[34] = arm(p[34], 'Right', [0.23, 0.37, -0.3], [-0.35, 0.55, -0.4], [0, 0, -1]);
  p[68] = arm(p[68], 'Right', [0.19, 0.9, -0.23], [-0.45, 0.72, -0.28], [0, 0, -1]);
  p[80] = groundLeg(p[80], 'Right', [-0.18, 0.12, 0.12], [0, 0.085, 0.43], q(55));
  p[80] = knees(p[80]);
  p[54].bones.mixamorigSpine2 = degrees(-32);
  for (const n of [84, 100])
    for (const side of sides) {
      const sign = side === 'Left' ? 1 : -1;
      p[n] = orient(p[n], `mixamorig${side}Shoulder`, q(0, 0, -sign * 18));
      p[n] = contactArm(
        p[n],
        side,
        [sign * 0.25, 0.055, 0.05],
        n === 84 ? [-sign * 0.55, 0, -0.84] : [0, 0, 1],
        n === 84,
      );
    }
  p[88] = straight(p[88], 'Right', false, [0, -0.45, -0.89], q(55));
  p[88] = palms(p[88], 0.64, 0.24);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[92] = leg(
      p[92],
      side,
      [sign * 0.12, 0.85, -0.17],
      [sign * 0.3, 0.49, 0.28],
      q(0, -sign * 70),
    );
  }
  p[94] = base(0.42, 180, 40);
  p[94] = orient(p[94], 'mixamorigNeck', q(-125));
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[94] = groundLeg(
      p[94],
      side,
      [sign * 0.24, 0.075, -0.58],
      [sign * 0.27, 0.085, -0.22],
      q(0, 180),
    );
    p[94] = straight(p[94], side, true, [0, -0.16, 1]);
  }
  p[96] = orient(p[96], 'mixamorigNeck', q(90));
  p[101] = arm(p[101], 'Left', [-0.62, 0.4, 0.19], [-0.43, 0.055, 0.35], [0, 1, 0], [1, 0, 0]);
  p[101] = arm(p[101], 'Right', [0.48, 0.18, 0.2], [0.02, 0.36, 0.32], [1, 0, 0]);
  p[108] = arm(p[108], 'Right', [0.36, 1.13, 0.4], [-0.32, 1.18, 0.46], [0, -1, 0], [0, 0, 1]);
  for (const n of [2, 107]) {
    for (const side of sides) {
      const sign = side === 'Left' ? 1 : -1;
      p[n] = groundLeg(
        p[n],
        side,
        [sign * 0.025, side === 'Left' ? 0.195 : 0.23, side === 'Left' ? 0.18 : 0.16],
        [sign * 0.42, 0.085, 0.31],
        q(180, -sign * 80),
      );
    }
    p[n] = n === 2 ? lap(p[n]) : knees(p[n]);
  }
  for (const n of [10, 42, 65]) {
    for (const side of sides) {
      const sign = side === 'Left' ? 1 : -1;
      if (n === 65 && side === 'Right') continue;
      p[n] = straight(p[n], side, false, [sign * 0.15, -0.56, -0.816], q());
    }
    for (const side of n === 10 ? sides : n === 65 ? (['Left'] as const) : []) {
      const sign = side === 'Left' ? 1 : -1;
      p[n] = groundArm(
        p[n],
        side,
        at(p[n], side, 'Foot').toArray(),
        [sign * 0.32, 0.05, -0.35],
        [0, 0, -1],
      );
    }
  }
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[32] = groundLeg(
      p[32],
      side,
      [sign * 0.08, 0.13, 0.29],
      [sign * 0.43, 0.085, 0.26],
      q(180, -sign * 80),
    );
    p[32] = arm(
      p[32],
      side,
      [sign * 0.2, 0.16, 0.25],
      [sign * 0.35, 0.31, -0.1],
      [-sign, 0, 0],
      [0, -1, 0],
    );
    p[69] = leg(p[69], side, [sign * 0.16, 0.4, 0.56], [sign * 0.18, 0.93, 0.24], q(-90));
  }
  p[85] = base(0.13, -90, 5);
  p[85] = straight(p[85], 'Right', false, [0, -0.025, 1], q(-70));
  p[85] = leg(p[85], 'Left', [0.19, 0.23, -0.6], [0.4, 0.42, -0.23], q(-90, -45));
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[85] = arm(
      p[85],
      side,
      [sign * 0.37, 0.055, 0.12],
      [sign * 0.42, 0.12, -0.18],
      [0, 0, 1],
      [0, -1, 0],
    );
  }
  p[101] = recliningStudy();
  p[101] = arm(p[101], 'Right', [-0.6, 0.34, 0.14], [-0.31, 0.055, 0.14], [-1, 0.2, 0], [0, 1, 0]);
  p[101] = arm(p[101], 'Left', [0.48, 0.2, 0.12], [0.13, 0.48, 0.12], [1, 0, 0], [0, -1, 0]);
  p[108] = arm(p[108], 'Right', [0.2, 1.13, 0.42], [-0.3, 1.12, 0.4], [0, -1, 0], [0, 0, 1]);
  p[8] = arm(p[8], 'Left', [0.085, 0.75, -0.16], [0.24, 1.15, -0.04], [0, -1, 0], [0, 0, 1]);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[38] = arm(p[38], side, [sign * 0.035, 0.36, 0.12], [sign * 0.36, 0.27, -0.05], [-sign, 0, 0]);
  }
  p[68] = leg(p[68], 'Left', [0.08, 0.83, -0.18], [0.2, 0.54, -0.4], q(0, 180));
  p[68] = arm(p[68], 'Left', [0.08, 0.83, -0.18], [0.35, 0.65, -0.18], [0, 0, -1]);
  p[68] = arm(p[68], 'Right', [0.08, 0.83, -0.18], [-0.35, 0.62, -0.25], [0, 0, -1]);
  p[99] = arm(p[99], 'Right', [0.18, 0.29, 0.27], [-0.36, 0.24, 0.36], [1, 0, 0]);
  p[101] = arm(p[101], 'Left', [0.1, 0.27, 0.21], [-0.2, 0.49, 0.22], [1, -0.2, -0.3], [0, -1, 0]);
  p[68] = arm(p[68], 'Right', [0.08, 0.835, -0.16], [-0.1253, 0.6439, -0.0534], [0, 0, -1]);
  for (const side of sides) p[42] = straight(p[42], side, true, [0, -0.15, 1]);
  p[65] = straight(p[65], 'Right', true, [0, -0.15, 1]);
  p[7] = base(0.26);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[7] = groundLeg(p[7], side, [sign * 0.035, 0.13, 0.2], [sign * 0.44, 0.085, 0.2], q(55));
  }
  p[7] = knees(p[7]);
  p[7].bones.mixamorigNeck = degrees(20);
  p[58] = base(0.85, 125, -5);
  p[58].bones.mixamorigNeck = degrees(-25);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[58] = leg(p[58], side, [sign * 0.13, 0.77, -0.1], [sign * 0.25, 0.59, 0.3], q(0, 180));
  }
  p[58] = palms(p[58], 0.43, 0.25);
  p[92] = base(0.9, 130, -5);
  p[92].bones.mixamorigNeck = degrees(-25);
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[92] = leg(p[92], side, [sign * 0.13, 0.91, -0.18], [sign * 0.3, 0.63, 0.3], q(0, 180));
  }
  p[92] = palms(p[92], 0.43, 0.25);
  p[70].root.position[1] += 0.1;
  p[70] = palms(p[70], 0.4, 0.25);
  p[105] = base(0.52);
  p[105] = leg(p[105], 'Right', [-0.11, 0.1, 0.2], [-0.11, 0.4, 0.35], q(40));
  p[105] = groundLeg(p[105], 'Left', [-0.13, 0.455, 0.2], [0.22, 0.085, 0.22], q(180, -70));
  p[105] = prayer(p[105]);
  p[47] = base(0.17, -20, 20);
  p[47] = orient(p[47], 'mixamorigNeck', q(10));
  for (const side of sides) {
    const sign = side === 'Left' ? 1 : -1;
    p[47] = leg(
      p[47],
      side,
      [sign * 0.025, 0.5, 0.3],
      [sign * 0.43, 0.53, 0.15],
      q(180, -sign * 80),
    );
    const h = world(p[47], 'mixamorigHead');
    p[47] = arm(
      p[47],
      side,
      [sign * 0.13, h.y + 0.025, h.z + 0.06],
      [sign * 0.21, 0.34, 0.19],
      [0, 1, 0],
      [-sign, 0, 0],
    );
  }
  return p;
}
