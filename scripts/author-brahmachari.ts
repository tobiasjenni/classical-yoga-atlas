/** Original skeletal studies of the primary illustrations in the supplied EPUB.
 * No generic animation is substituted for a book's undocumented entry/exit. */
import { readFileSync, writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { identity, degrees } from '../src/core/motion.ts';
import { makeRig, applyPose, readPose } from '../src/core/rig.ts';
import { clearBody, bodyClearance } from '../src/core/clearance.ts';
import { poseSchema, type Pose } from '../src/core/schema.ts';
import {
  finals,
  arms,
  legs,
  limb,
  world,
  q,
  seat,
  lotus,
  handsOnKnees,
  orient,
} from './seed-poses.ts';
type V = [number, number, number];
const copy = (p: Pose) => structuredClone(p);
const poses: Record<number, Pose> = {};
function base(x = 0, y = 0.96, z = 0, spine = [0, 0, 0]) {
  const p = identity();
  p.root.position = [0, y, z];
  p.root.rotation = degrees(x);
  p.bones.mixamorigSpine = degrees(spine[0]);
  p.bones.mixamorigSpine1 = degrees(spine[1]);
  p.bones.mixamorigSpine2 = degrees(spine[2]);
  return p;
}
function feet(
  p: Pose,
  l: V,
  r: V,
  lp: V = [0.4, 0.3, 0.4],
  rp: V = [-0.4, 0.3, 0.4],
  ro = [q(-90), q(-90)],
) {
  return legs(p, l, r, [lp, rp], ro);
}
function hands(p: Pose, l: V, r: V, lp: V = [0.65, 0.55, 0.15], rp: V = [-0.65, 0.55, 0.15]) {
  return arms(p, l, r, [lp, rp]);
}
function knee(y = 0.19, x = 0, spread = 0.12) {
  return feet(
    base(x, y),
    [spread, 0.065, 0.035],
    [-spread, 0.065, 0.035],
    [spread, 0.09, 0.8],
    [-spread, 0.09, 0.8],
    [q(0, 180), q(0, 180)],
  );
}
function kneeHands(p: Pose) {
  return handsOnKnees(p);
}
function overhead(p: Pose, height?: number) {
  const head = world(p, 'mixamorigHead');
  const y = height ?? head.y + 0.36;
  return hands(
    p,
    [0.035, y, 0.05],
    [-0.035, y, 0.05],
    [0.35, y - 0.2, 0.08],
    [-0.35, y - 0.2, 0.08],
  );
}
function prayer(p: Pose) {
  const chest = world(p, 'mixamorigSpine2');
  return hands(
    p,
    [0.028, chest.y, 0.19],
    [-0.028, chest.y, 0.19],
    [0.4, chest.y - 0.2, 0.14],
    [-0.4, chest.y - 0.2, 0.14],
  );
}
function floorHands(p: Pose, z = 0.17, width = 0.25) {
  return hands(
    p,
    [width, 0.035, z],
    [-width, 0.035, z],
    [width + 0.07, 0.35, z],
    [-width - 0.07, 0.35, z],
  );
}
function straightSeat(spread = 0.11) {
  return feet(
    copy(seat),
    [spread, 0.075, Math.sqrt(Math.max(0.01, 0.829 ** 2 - (spread - 0.105) ** 2))],
    [-spread, 0.075, Math.sqrt(Math.max(0.01, 0.829 ** 2 - (spread - 0.105) ** 2))],
  );
}
function fold(spread = 0.11, angle = 65) {
  let p = straightSeat(spread);
  const lf = world(p, 'mixamorigLeftFoot').toArray(),
    rf = world(p, 'mixamorigRightFoot').toArray();
  p.root.rotation = degrees(angle);
  p.bones.mixamorigSpine = degrees(6);
  p.bones.mixamorigSpine1 = degrees(6);
  p = feet(p, lf, rf, [spread, 0.15, 0.4], [-spread, 0.15, 0.4]);
  return hands(p, [lf[0], lf[1] + 0.12, lf[2]], [rf[0], rf[1] + 0.12, rf[2]]);
}
function backKnee() {
  let p = knee(0.37, -55);
  p.bones.mixamorigSpine = degrees(-25);
  p.bones.mixamorigSpine1 = degrees(-30);
  p.bones.mixamorigSpine2 = degrees(-25);
  p.bones.mixamorigNeck = degrees(-25);
  p = feet(
    p,
    [0.13, 0.065, 0.05],
    [-0.13, 0.065, 0.05],
    [0.13, 0.09, 0.55],
    [-0.13, 0.09, 0.55],
    [q(0, 180), q(0, 180)],
  );
  return hands(p, [0.16, 0.12, 0.26], [-0.16, 0.12, 0.26], [0.4, 0.15, -0.05], [-0.4, 0.15, -0.05]);
}
function prone(chest = 0) {
  let p = base(90, 0.13, 0, [-chest, -chest, -chest]);
  p.bones.mixamorigNeck = degrees(-25);
  return p;
}
function cobra() {
  return floorHands(prone(22), 0.4, 0.25);
}
function inversion(hand = false) {
  let p = base(180, hand ? 1.13 : 0.79);
  p.bones.mixamorigNeck = degrees(hand ? -10 : 0);
  p = orient(orient(p, 'mixamorigLeftFoot', q(-90)), 'mixamorigRightFoot', q(-90));
  return floorHands(p, hand ? 0.06 : 0.12, hand ? 0.24 : 0.2);
}
function shoulder(plough = false) {
  let p = plough ? base(190, 0.6, 0.18, [10, 10, 10]) : base(180, 0.67);
  p.bones.mixamorigNeck = degrees(plough ? 50 : 90);
  p = feet(
    p,
    [0.105, plough ? 0.085 : 1.499, plough ? -0.4 : 0],
    [-0.105, plough ? 0.085 : 1.499, plough ? -0.4 : 0],
    [0.12, 0.8, -0.5],
    [-0.12, 0.8, -0.5],
    [q(), q()],
  );
  return plough
    ? hands(p, [0.11, 0.09, -0.4], [-0.11, 0.09, -0.4], [0.4, 0.09, -0.22], [-0.4, 0.09, -0.22])
    : hands(p, [0.15, 0.42, 0.12], [-0.15, 0.42, 0.12], [0.3, 0.07, 0.12], [-0.3, 0.07, 0.12]);
}
function wheel() {
  let p = base(-70, 0.62, 0, [-25, -25, -20]);
  p = feet(
    p,
    [0.19, 0.07, 0.45],
    [-0.19, 0.07, 0.45],
    [0.25, 0.6, 0.4],
    [-0.25, 0.6, 0.4],
    [q(), q()],
  );
  return floorHands(p, -0.6, 0.24);
}
function squat(spread = 0.15, y = 0.28) {
  let p = feet(
    base(0, y),
    [0.07, 0.105, 0.04],
    [-0.07, 0.105, 0.04],
    [spread, 0.3, 0.45],
    [-spread, 0.3, 0.45],
    [q(55), q(55)],
  );
  return kneeHands(p);
}
function behind(p: Pose = copy(seat), both = true) {
  const h = world(p, 'mixamorigHead');
  p = limb(p, 'Left', false, [0.1, h.y + 0.015, -0.19], [0.65, h.y - 0.3, 0.17], q(0, 90));
  if (both)
    p = limb(p, 'Right', false, [-0.1, h.y + 0.04, -0.21], [-0.65, h.y - 0.3, 0.17], q(0, -90));
  return prayer(p);
}
function bound(p = copy(lotus)) {
  return hands(
    p,
    [-0.06, 0.38, -0.13],
    [0.06, 0.36, -0.15],
    [0.4, 0.34, -0.14],
    [-0.4, 0.32, -0.14],
  );
}
function armsBack(p: Pose) {
  return hands(
    p,
    [0.08, 0.55, -0.16],
    [0.075, 0.52, -0.16],
    [0.3, 0.85, -0.04],
    [-0.3, 0.33, -0.04],
  );
}
function lunge() {
  return feet(
    base(0, 0.51),
    [0.12, 0.065, 0.46],
    [-0.12, 0.065, -0.73],
    [0.12, 0.45, 0.48],
    [-0.12, 0.22, -0.4],
    [q(), q(20)],
  );
}
function toeHold(side = false) {
  let p = base();
  p = limb(
    p,
    'Left',
    false,
    side ? [0.81, 0.98, 0.1] : [0.12, 1.12, 0.73],
    side ? [0.5, 0.98, 0.12] : [0.12, 1.0, 0.4],
    q(-90),
  );
  return hands(p, world(p, 'mixamorigLeftFoot').toArray(), [-0.23, 0.95, 0.03]);
}
function handBalance(legsMode = 'tuck') {
  let p = base(35, 0.48, 0, [5, 0, 0]);
  p = feet(
    p,
    legsMode === 'straight' ? [0.65, 0.22, 0.52] : [0.17, 0.44, -0.2],
    legsMode === 'straight' ? [-0.65, 0.22, 0.52] : [-0.17, 0.44, -0.2],
    [0.4, 0.52, 0.3],
    [-0.4, 0.52, 0.3],
  );
  return floorHands(p, 0.33, 0.26);
}
function seatedLift(p: Pose = copy(lotus)) {
  p.root.position[1] = 0.27;
  p.root.rotation = degrees(15);
  return floorHands(p, 0.15, 0.28);
}
function archer() {
  return copy(finals.dhanurasana);
}
function uprightFeet(p: Pose = copy(seat)) {
  p = feet(p, [0.34, 0.78, 0.43], [-0.34, 0.78, 0.43], [0.45, 0.5, 0.35], [-0.45, 0.5, 0.35]);
  return hands(
    p,
    world(p, 'mixamorigLeftFoot').toArray(),
    world(p, 'mixamorigRightFoot').toArray(),
  );
}
// The first 32 sections follow the book's illustrated classical inventory.
poses[1] = copy(finals.siddhasana);
poses[1] = hands(poses[1], [0.04, 0.27, 0.24], [-0.04, 0.25, 0.24]);
poses[2] = hands(copy(lotus), [0.04, 0.28, 0.25], [-0.04, 0.26, 0.25]);
poses[3] = hands(
  knee(),
  [0.13, 0.1, -0.06],
  [-0.13, 0.1, -0.06],
  [0.28, 0.32, -0.13],
  [-0.28, 0.32, -0.13],
);
poses[4] = copy(finals.svastikasana);
poses[5] = kneeHands(knee());
poses[6] = copy(finals.svastikasana);
poses[7] = squat(0.39, 0.26);
poses[8] = armsBack(copy(finals.gomukhasana));
poses[9] = hands(
  lunge(),
  [0.22, 0.98, 0.61],
  [-0.16, 0.7, -0.18],
  [0.24, 0.98, 0.3],
  [-0.35, 0.6, -0.18],
);
poses[10] = shoulder(true);
poses[11] = copy(finals.shavasana);
poses[12] = kneeHands(
  feet(
    copy(seat),
    [-0.11, 0.07, -0.06],
    [0.11, 0.07, -0.04],
    [0.38, 0.08, 0.15],
    [-0.38, 0.08, 0.15],
    [q(0, -90), q(0, 90)],
  ),
);
poses[13] = copy(lotus);
poses[13].root.rotation = degrees(-80);
poses[13].root.position = [0, 0.31, 0.05];
poses[13].bones.mixamorigSpine = degrees(-15);
poses[13].bones.mixamorigSpine1 = degrees(-15);
poses[13].bones.mixamorigNeck = degrees(-30);
poses[13] = hands(
  poses[13],
  world(poses[13], 'mixamorigLeftFoot').toArray(),
  world(poses[13], 'mixamorigRightFoot').toArray(),
);
poses[14] = copy(finals.matsyendrasana);
poses[14] = hands(poses[14], [0.22, 0.22, -0.12], world(poses[14], 'mixamorigLeftFoot').toArray());
poses[15] = kneeHands(
  feet(
    copy(seat),
    [0.025, 0.15, 0.05],
    [-0.025, 0.15, 0.05],
    [0.45, 0.09, 0.04],
    [-0.45, 0.09, 0.04],
    [q(0, 0, -90), q(0, 0, 90)],
  ),
);
poses[16] = fold();
poses[17] = prayer(squat(0.2));
poses[18] = overhead(
  limb(base(), 'Left', false, [-0.2, 0.35, -0.06], [0.02, 0.62, 0.27], q(0, 0, 20)),
);
poses[19] = copy(finals.mayurasana);
poses[20] = copy(finals.kukkutasana);
poses[21] = hands(
  knee(0.19, 30),
  [0.09, 0.4, 0.37],
  [-0.09, 0.4, 0.37],
  [0.14, 0.37, 0.13],
  [-0.14, 0.37, 0.13],
);
poses[22] = backKnee();
poses[23] = copy(poses[22]);
poses[23] = hands(
  poses[23],
  [0.36, 0.12, -0.33],
  [-0.36, 0.12, -0.33],
  [0.42, 0.1, -0.2],
  [-0.42, 0.1, -0.2],
);
poses[24] = inversion(true);
poses[25] = copy(poses[21]);
poses[25] = hands(poses[25], [0.05, 0.35, 0.38], [-0.05, 0.35, 0.38]);
poses[26] = limb(base(), 'Left', false, [-0.22, 0.37, -0.02], [0.02, 0.6, 0.25], q());
poses[26] = hands(
  poses[26],
  [-0.02, 1.35, 0.32],
  [0.02, 1.35, 0.3],
  [0.14, 1.15, 0.37],
  [-0.14, 1.15, 0.37],
);
poses[27] = feet(
  base(60, 0.23, 0),
  [0.24, 0.07, -0.3],
  [-0.1, 0.07, -0.02],
  [0.28, 0.09, 0.1],
  [-0.4, 0.09, 0.14],
  [q(), q()],
);
poses[27] = floorHands(poses[27], 0.6);
poses[28] = prone();
poses[28] = feet(
  poses[28],
  [0.105, 0.43, -0.7],
  [-0.105, 0.43, -0.7],
  [0.12, 0.27, -0.36],
  [-0.12, 0.27, -0.36],
);
poses[28] = hands(poses[28], [0.16, 0.055, 0.05], [-0.16, 0.055, 0.05]);
poses[29] = hands(prone(), [0.15, 0.045, 0.92], [-0.15, 0.045, 0.92]);
poses[30] = feet(
  prone(20),
  [0.15, 0.48, -0.27],
  [-0.15, 0.48, -0.27],
  [0.15, 0.12, -0.45],
  [-0.15, 0.12, -0.45],
);
poses[30] = hands(
  poses[30],
  world(poses[30], 'mixamorigLeftFoot').toArray(),
  world(poses[30], 'mixamorigRightFoot').toArray(),
  [0.3, 0.38, 0.08],
  [-0.3, 0.38, 0.08],
);
poses[31] = cobra();
poses[32] = bound();
poses[32].root.rotation = degrees(65);
poses[32].bones.mixamorigSpine = degrees(20);
poses[33] = wheel();
poses[34] = copy(finals.shavasana);
poses[34] = limb(poses[34], 'Left', false, [0.12, 0.33, 0.28], [0.12, 0.38, -0.16], q());
poses[34] = hands(poses[34], [0.08, 0.43, -0.02], [0.16, 0.43, -0.02]);
poses[35] = feet(copy(finals.shavasana), [0.1, 0.42, 0.92], [-0.1, 0.42, 0.92]);
poses[35].bones.mixamorigNeck = degrees(20);
poses[36] = toeHold();
poses[37] = bound();
poses[38] = behind();
poses[38].root.rotation = degrees(-85);
poses[38].root.position = [0, 0.18, 0.03];
poses[39] = hands(prone(10), [0.15, 0.33, 0.91], [-0.15, 0.33, 0.91]);
poses[39] = feet(poses[39], [0.11, 0.37, -0.75], [-0.11, 0.37, -0.75]);
poses[40] = feet(
  base(0, 0.88),
  [0.68, 0.06, 0],
  [-0.68, 0.06, 0],
  [0.4, 0.45, 0],
  [-0.4, 0.45, 0],
  [q(), q()],
);
poses[40].bones.mixamorigSpine = degrees(0, 0, 35);
poses[40].bones.mixamorigSpine1 = degrees(0, 0, 30);
poses[40] = hands(poses[40], [0.69, 0.1, 0.03], [-0.35, 1.31, 0.03]);
poses[41] = fold(0.86, 65);
poses[42] = shoulder(true);
poses[43] = archer();
poses[44] = overhead(base());
poses[44].bones.mixamorigSpine = degrees(0, 0, 15);
poses[44].bones.mixamorigSpine1 = degrees(0, 0, 20);
poses[45] = overhead(copy(lotus));
poses[46] = limb(squat(0.12, 0.33), 'Left', false, [-0.14, 0.48, 0.18], [0.42, 0.48, 0.2], q());
poses[46] = hands(poses[46], [0.17, 0.99, 0.12], [-0.27, 0.75, 0]);
poses[47] = copy(lotus);
poses[47] = hands(
  poses[47],
  [0.13, 0.66, 0.22],
  [-0.13, 0.66, 0.22],
  [0.1, 0.24, 0.3],
  [-0.1, 0.24, 0.3],
);
poses[48] = kneeHands(knee(0.16, 0, 0.27));
poses[49] = seatedLift();
poses[50] = copy(finals.matsyendrasana);
poses[51] = hands(squat(), [0.08, 0.48, 0.44], [-0.08, 0.48, 0.44]);
poses[52] = shoulder();
poses[53] = kneeHands(
  feet(
    copy(seat),
    [0.16, 0.17, 0.19],
    [-0.16, 0.17, 0.19],
    [0.45, 0.09, 0.12],
    [-0.45, 0.09, 0.12],
    [q(180, -70), q(180, 70)],
  ),
);
poses[54] = wheel();
poses[54].bones.mixamorigNeck = degrees(-80);
poses[54] = floorHands(poses[54], -0.35, 0.27);
poses[55] = limb(base(), 'Left', false, [0.12, 1.2, -0.72], [0.12, 0.8, -0.4], q());
poses[55] = hands(poses[55], [0.19, 1.9, 0], [-0.78, 1.4, 0]);
poses[56] = prayer(
  feet(
    copy(seat),
    [0.04, 0.43, 0.12],
    [-0.04, 0.43, 0.12],
    [0.43, 0.1, 0.04],
    [-0.43, 0.1, 0.04],
    [q(0, 0, -90), q(0, 0, 90)],
  ),
);
poses[57] = copy(finals.matsyendrasana);
poses[58] = handBalance();
poses[59] = handBalance('straight');
poses[60] = copy(base(155, 0.92, 0));
poses[60] = feet(
  poses[60],
  [0.3, 0.07, 0],
  [-0.3, 0.07, 0],
  [0.3, 0.48, 0],
  [-0.3, 0.48, 0],
  [q(), q()],
);
poses[60] = hands(
  poses[60],
  [0.08, 0.48, -0.4],
  [-0.08, 0.48, -0.4],
  [0.42, 0.37, -0.35],
  [-0.42, 0.37, -0.35],
);
poses[61] = seatedLift(copy(finals.svastikasana));
poses[62] = prayer(copy(finals.svastikasana));
poses[63] = copy(finals.svastikasana);
poses[63] = limb(poses[63], 'Left', false, [0.11, 0.075, 0.829], [0.12, 0.15, 0.45], q(-90));
poses[63].root.rotation = degrees(65);
poses[63] = feet(
  poses[63],
  [0.11, 0.075, 0.829],
  [0.1, 0.1, 0.22],
  [0.12, 0.12, 0.45],
  [-0.5, 0.1, 0.2],
);
poses[63] = hands(poses[63], [0.11, 0.18, 0.83], [0.09, 0.18, 0.8]);
poses[64] = copy(base(160, 0.88));
poses[64] = feet(
  poses[64],
  [0.1, 0.07, 0.03],
  [-0.1, 0.07, 0.03],
  [0.1, 0.49, 0.03],
  [-0.1, 0.49, 0.03],
  [q(), q()],
);
poses[64] = hands(poses[64], [0.12, 0.075, 0.1], [-0.12, 0.075, 0.1]);
poses[65] = shoulder(true);
poses[65] = feet(poses[65], [0.55, 0.22, -0.32], [-0.55, 0.22, -0.32]);
poses[66] = handBalance('straight');
poses[66] = limb(poses[66], 'Right', false, [-0.2, 0.62, 0.05], [-0.48, 0.65, 0.3], q());
poses[67] = handBalance();
poses[67] = feet(
  poses[67],
  [0.15, 0.51, 0.23],
  [-0.15, 0.51, 0.23],
  [0.44, 0.69, 0.2],
  [-0.44, 0.69, 0.2],
);
poses[68] = limb(base(), 'Left', false, [0.11, 1.74, 0.2], [0.12, 1.35, 0.2], q());
poses[68] = hands(poses[68], [0.12, 1.75, 0.2], [-0.02, 1.75, 0.2]);
poses[69] = wheel();
poses[69] = feet(
  poses[69],
  [0.17, 0.34, -0.43],
  [-0.17, 0.34, -0.43],
  [0.2, 0.86, -0.2],
  [-0.2, 0.86, -0.2],
);
poses[70] = seatedLift(behind());
poses[71] = overhead(base(0, 1.0));
poses[72] = hands(knee(0.52, 0, 0.37), [0.7, 0.89, 0.05], [-0.7, 0.89, 0.05]);
poses[73] = feet(
  copy(seat),
  [0.28, 0.83, 0.13],
  [-0.08, 0.1, 0.24],
  [0.52, 0.42, 0.2],
  [-0.48, 0.1, 0.2],
);
poses[73] = hands(poses[73], [0.28, 0.83, 0.13], [-0.2, 0.65, 0.2]);
poses[74] = uprightFeet();
poses[75] = hands(knee(0.52, 0, 0.23), [0.17, 0.7, -0.15], [-0.17, 0.7, -0.15]);
poses[76] = copy(poses[64]);
poses[77] = behind(copy(seat), false);
poses[78] = behind();
poses[79] = copy(poses[56]);
poses[80] = copy(poses[51]);
poses[80].bones.mixamorigSpine1 = degrees(0, 40);
poses[80] = hands(poses[80], [0.28, 0.3, 0.3], [-0.17, 0.42, 0.2]);
poses[81] = floorHands(straightSeat(), 0.16, 0.27);
poses[82] = uprightFeet();
poses[83] = kneeHands(straightSeat(0.92));
poses[84] = inversion();
poses[85] = behind(copy(seat), false);
poses[85].root.rotation = degrees(-85);
poses[85].root.position = [0, 0.15, 0];
poses[85] = hands(poses[85], [0.3, 0.1, 0.35], [-0.3, 0.1, 0.35]);
poses[86] = base();
poses[86].bones.mixamorigSpine1 = degrees(0, 40);
poses[86] = hands(poses[86], [0.5, 1.37, 0.35], [-0.3, 1.37, -0.5]);
poses[87] = kneeHands(copy(poses[15]));
poses[88] = seatedLift(behind(copy(seat), false));
poses[89] = backKnee();
poses[90] = fold(0.92, 70);
poses[91] = squat(0.16, 0.25);
poses[92] = handBalance();
poses[92].root.rotation = degrees(60);
poses[93] = copy(finals.shavasana);
poses[93] = limb(poses[93], 'Left', false, [0.12, 0.37, -0.38], [0.12, 0.38, -0.1], q());
poses[93] = hands(poses[93], world(poses[93], 'mixamorigLeftFoot').toArray(), [0.1, 0.37, -0.38]);
poses[94] = shoulder(true);
poses[94] = feet(
  poses[94],
  [0.13, 0.07, -0.49],
  [-0.13, 0.07, -0.49],
  [0.2, 0.13, -0.25],
  [-0.2, 0.13, -0.25],
);
poses[94] = hands(poses[94], [0.3, 0.04, 0.25], [-0.3, 0.04, 0.25]);
poses[95] = uprightFeet();
poses[96] = copy(poses[63]);
poses[97] = behind(base(), false);
poses[97] = hands(poses[97], [0.75, 1.3, 0], [-0.75, 1.3, 0]);
poses[98] = behind(knee(), false);
poses[99] = hands(copy(poses[15]), [0.07, 0.32, 0.3], [-0.07, 0.32, 0.3]);
poses[100] = inversion();
poses[100].root.position[1] = 0.95;
poses[100] = feet(
  poses[100],
  [0.12, 0.75, 0.3],
  [-0.12, 0.75, 0.3],
  [0.2, 1.3, 0.12],
  [-0.2, 1.3, 0.12],
);
poses[100] = floorHands(poses[100], 0.23, 0.25);
poses[101] = copy(finals.shavasana);
poses[101].root.rotation = degrees(-90, 0, 65);
poses[101].root.position[1] = 0.25;
poses[101] = hands(poses[101], [0.3, 0.05, 0.12], [-0.2, 0.3, 0.4]);
poses[102] = copy(lotus);
poses[102].root.rotation = degrees(90);
poses[102].root.position = [0, 0.34, 0];
poses[102] = floorHands(poses[102], 0.15, 0.2);
poses[103] = wheel();
poses[103] = feet(
  poses[103],
  [0.25, 0.07, -0.25],
  [-0.25, 0.07, -0.25],
  [0.34, 0.53, 0.12],
  [-0.34, 0.53, 0.12],
);
poses[104] = copy(poses[97]);
poses[105] = limb(knee(0.58), 'Left', false, [-0.16, 0.55, 0.25], [0.29, 0.16, 0.24], q(180, -60));
poses[105] = prayer(poses[105]);
poses[106] = limb(base(60, 0.91), 'Left', false, [0.12, 1.68, -0.36], [0.12, 1.26, -0.58], q());
poses[106] = limb(poses[106], 'Right', false, [-0.12, 0.07, 0], [-0.12, 0.5, 0], q());
poses[106] = hands(poses[106], [0.12, 1.68, -0.36], [-0.14, 1.39, 0.82]);
poses[107] = handsOnKnees(copy(lotus));
poses[107].bones.mixamorigNeck = degrees(25);
poses[108] = limb(base(), 'Left', false, [0.12, 0.94, 0.46], [0.12, 1.31, 0.36], q());
poses[108] = hands(poses[108], [0.38, 1.37, 0.48], [-0.36, 1.32, 0.48]);
const book = JSON.parse(
  readFileSync(new URL('../src/data/brahmachari.json', import.meta.url), 'utf8'),
);
poses[91] = squat(0.18, 0.28);
poses[88] = feet(
  base(60, 0.45),
  [0.12, 0.85, 0.34],
  [-0.13, 0.07, -0.35],
  [0.55, 0.55, 0.3],
  [-0.13, 0.09, 0.12],
);
poses[88] = floorHands(poses[88], 0.66, 0.25);
// Full source audit: distinguish configurations previously sharing a generic study.
// Each override refers to the primary illustration selected by the importer.
poses[17] = hands(squat(0.2), [0.05, 0.59, 0.27], [-0.05, 0.59, 0.27]);
poses[23] = hands(
  backKnee(),
  [0.17, 0.065, -0.69],
  [-0.17, 0.065, -0.69],
  [0.25, 0.08, -0.45],
  [-0.25, 0.08, -0.45],
);
poses[25] = hands(
  knee(0.19, 30),
  [0.11, 0.39, -0.13],
  [-0.11, 0.39, -0.13],
  [0.4, 0.47, -0.12],
  [-0.4, 0.47, -0.12],
);
poses[36] = copy(poses[36]);
poses[36].bones.mixamorigSpine = degrees(22);
poses[36].bones.mixamorigSpine1 = degrees(18);
poses[36] = hands(
  poses[36],
  world(poses[36], 'mixamorigLeftFoot').toArray(),
  world(poses[36], 'mixamorigLeftFoot').toArray(),
);
poses[40] = feet(
  base(0, 0.68),
  [0.68, 0.065, 0],
  [-0.68, 0.065, 0],
  [0.4, 0.4, 0],
  [-0.4, 0.4, 0],
  [q(), q()],
);
poses[40].bones.mixamorigSpine = degrees(0, 0, -35);
poses[40].bones.mixamorigSpine1 = degrees(0, 0, -30);
poses[40] = hands(poses[40], [0.69, 0.12, 0.03], [0.64, 1.01, 0.03], [0.7, 0.4, 0], [0.25, 1.2, 0]);
poses[41] = fold(0.925, 85);
// Sarvangasana Im70 leaves the arms on the ground alongside the trunk.
poses[42] = hands(
  shoulder(true),
  [0.22, 0.055, 0.62],
  [-0.22, 0.055, 0.62],
  [0.24, 0.06, 0.2],
  [-0.24, 0.06, 0.2],
);
poses[45] = overhead(
  feet(
    base(0, 0.4),
    [-0.17, 0.34, 0.08],
    [0.17, 0.34, 0.08],
    [0.28, 0.085, 0.16],
    [-0.28, 0.085, 0.16],
    [q(180, -70), q(180, 70)],
  ),
);
poses[46] = hands(
  poses[46],
  [0.16, 0.61, -0.03],
  [-0.16, 0.61, -0.03],
  [0.38, 0.63, -0.06],
  [-0.38, 0.63, -0.06],
);
poses[47] = copy(lotus);
poses[47].root.rotation = degrees(-35);
poses[47] = hands(
  poses[47],
  [0.08, 0.65, -0.07],
  [-0.08, 0.65, -0.07],
  [0.22, 0.25, 0.2],
  [-0.22, 0.25, 0.2],
);
poses[50] = feet(
  base(0, 0.22),
  [0.13, 0.065, 0.57],
  [-0.11, 0.17, -0.22],
  [0.13, 0.51, 0.3],
  [-0.38, 0.085, 0.13],
  [q(), q(0, 160)],
);
poses[50] = arms(
  poses[50],
  world(poses[50], 'mixamorigLeftLeg')
    .add(new Vector3(0, 0.075, -0.035))
    .toArray(),
  [-0.14, world(poses[50], 'mixamorigHead').y - 0.035, 0.025],
  [
    [0.35, 0.52, 0.22],
    [-0.23, 0.38, 0.14],
  ],
  [q(90, 0, 180), q(0, 0, 180)],
);
poses[56] = kneeHands(poses[56]);
// Titibhasana uses the arm balance, Im91, rather than the supine toe-hold preparation.
poses[59] = feet(
  handBalance('straight'),
  [0.59, 0.8, 0.42],
  [-0.59, 0.8, 0.42],
  [0.46, 0.7, 0.31],
  [-0.46, 0.7, 0.31],
);
poses[62] = hands(copy(finals.svastikasana), [0.04, 0.27, 0.24], [-0.04, 0.25, 0.24]);
poses[63].root.rotation = degrees(85);
poses[63] = feet(
  poses[63],
  [0.11, 0.075, 0.829],
  [0.1, 0.1, 0.22],
  [0.12, 0.12, 0.45],
  [-0.5, 0.1, 0.2],
);
poses[63] = hands(
  poses[63],
  [0.11, 0.18, 0.83],
  [-0.12, 0.38, 0.07],
  [0.25, 0.2, 0.62],
  [-0.38, 0.43, 0.19],
);
poses[65] = feet(
  shoulder(true),
  [0.11, 0.085, -0.48],
  [-0.11, 0.56, -0.58],
  [0.14, 0.4, -0.3],
  [-0.14, 0.6, -0.3],
);
poses[65] = hands(poses[65], [0.11, 0.1, -0.48], [-0.22, 0.055, 0.62]);
poses[68] = feet(
  base(160, 0.87),
  [0.12, 0.88, -0.08],
  [-0.12, 0.075, 0],
  [0.12, 1.25, 0.15],
  [-0.12, 0.48, 0],
  [q(0, 180), q()],
);
poses[68] = hands(
  poses[68],
  [0.1, 0.88, -0.08],
  [0.14, 0.88, -0.08],
  [0.36, 0.72, 0.15],
  [-0.3, 0.7, 0.15],
);
poses[69] = feet(
  base(145, 0.57, 0, [-10, -15, -20]),
  [0.08, 0.25, 0.44],
  [-0.08, 0.25, 0.44],
  [0.3, 0.93, 0.3],
  [-0.3, 0.93, 0.3],
  [q(0, 180), q(0, 180)],
);
poses[69] = hands(
  poses[69],
  [0.77, 0.055, 0.36],
  [-0.77, 0.055, 0.36],
  [0.48, 0.065, 0.34],
  [-0.48, 0.065, 0.34],
);
poses[79] = kneeHands(
  feet(
    copy(seat),
    [0.035, 0.15, 0.19],
    [-0.035, 0.15, 0.19],
    [0.44, 0.085, 0.12],
    [-0.44, 0.085, 0.12],
    [q(0, 0, -90), q(0, 0, 90)],
  ),
);
poses[80] = feet(
  base(0, 0.3),
  [0.13, 0.075, 0.19],
  [-0.08, 0.075, 0.1],
  [0.3, 0.42, 0.4],
  [-0.05, 0.085, 0.4],
  [q(), q(50)],
);
poses[80].bones.mixamorigSpine1 = degrees(0, 40);
poses[80] = hands(poses[80], [0.23, 0.48, 0.3], [-0.08, 0.16, 0.4]);
poses[82] = feet(
  base(-18, 0.19),
  [0.12, 0.86, 0.47],
  [-0.12, 0.86, 0.47],
  [0.16, 0.58, 0.3],
  [-0.16, 0.58, 0.3],
);
poses[82] = hands(
  poses[82],
  world(poses[82], 'mixamorigLeftFoot').toArray(),
  world(poses[82], 'mixamorigRightFoot').toArray(),
);
// Forearms, rather than spread palms, support the headstand in Im130.
poses[84] = hands(
  inversion(),
  [0.045, 0.065, -0.1],
  [-0.045, 0.065, -0.1],
  [0.25, 0.055, 0.17],
  [-0.25, 0.055, 0.17],
);
poses[86] = hands(poses[86], [0.65, 1.28, 0.25], [0.43, 1.28, 0.3]);
poses[90] = fold(0.925, 85);
poses[90] = hands(
  poses[90],
  [0.08, 0.28, 0.32],
  [-0.08, 0.28, 0.32],
  [0.4, 0.12, 0.45],
  [-0.4, 0.12, 0.45],
);
poses[95] = feet(
  base(45, 0.17, 0, [15, 10, 0]),
  [0.17, 0.46, 0.5],
  [-0.17, 0.48, 0.5],
  [0.44, 0.6, 0.1],
  [-0.44, 0.6, 0.1],
  [q(90, -90), q(90, 90)],
);
poses[95].bones.mixamorigNeck = degrees(-70);
poses[95] = hands(
  poses[95],
  world(poses[95], 'mixamorigLeftFoot').toArray(),
  world(poses[95], 'mixamorigRightFoot').toArray(),
);
poses[96] = feet(
  base(120, 0.59),
  [0.1, 0.065, 0.55],
  [-0.1, 0.065, -0.51],
  [0.1, 0.4, 0.3],
  [-0.1, 0.4, -0.3],
  [q(), q()],
);
poses[96] = hands(
  poses[96],
  [0.035, 0.84, -0.15],
  [-0.035, 0.84, -0.15],
  [0.3, 0.71, 0.05],
  [-0.3, 0.71, 0.05],
);
poses[97] = feet(
  base(0, 0.936),
  [0.09, 0.065, 0.17],
  [-0.09, 0.065, -0.17],
  [0.1, 0.45, 0.1],
  [-0.1, 0.45, -0.1],
  [q(), q()],
);
poses[97] = hands(poses[97], [0.22, 1.15, 0.59], [-0.22, 1.15, -0.59]);
poses[97].bones.mixamorigNeck = degrees(-10);
poses[101] = base(0, 0.23);
poses[101].root.rotation = degrees(0, 0, 80);
poses[101] = feet(
  poses[101],
  [0.84, 0.065, 0],
  [0.14, 0.075, 0.23],
  [0.5, 0.1, 0],
  [0.1, 0.085, 0.51],
  [q(0, 0, -90), q(0, 90)],
);
poses[101] = hands(
  poses[101],
  [-0.57, 0.34, 0.07],
  [0.49, 0.17, 0.15],
  [-0.32, 0.055, 0.07],
  [0.2, 0.21, 0.15],
);
poses[103] = feet(
  base(70, 0.46),
  [0.16, 0.075, 0.08],
  [-0.63, 0.075, -0.35],
  [0.42, 0.6, 0.04],
  [-0.4, 0.16, -0.2],
  [q(), q(0, -35)],
);
poses[103].bones.mixamorigSpine1 = degrees(0, 30);
poses[103] = floorHands(poses[103], 0.66, 0.23);
poses[108] = feet(
  base(0, 0.7),
  [0.12, 0.43, 0.48],
  [-0.12, 0.075, 0],
  [0.12, 0.73, 0.58],
  [-0.12, 0.4, 0.28],
  [q(35), q(35)],
);
poses[108] = hands(poses[108], [0.17, 1.1, 0.55], [-0.12, 1.15, 0.48]);

const rig = makeRig('human'),
  referenceRig = makeRig('reference'),
  point = new Vector3(),
  out = [];
for (const e of book.entries.filter((e: any) => e.kind === 'posture')) {
  const raw = poses[e.order];
  if (!raw) throw new Error(`Missing ${e.order} ${e.id}`);
  applyPose(rig, raw);
  const before = Object.fromEntries(
    ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot'].map((n) => [
      n,
      world(raw, `mixamorig${n}` as any),
    ]),
  );
  clearBody(rig);
  clearBody(rig);
  let p = readPose(rig, raw);
  applyPose(rig, p);
  rig.mesh.skeleton.update();
  const vertices = rig.mesh.geometry.getAttribute('position');
  let lowest = Infinity;
  for (let i = 0; i < vertices.count; i++) {
    point.fromBufferAttribute(vertices, i);
    rig.mesh.applyBoneTransform(i, point);
    lowest = Math.min(lowest, point.y);
  }
  applyPose(referenceRig, p);
  referenceRig.mesh.skeleton.update();
  const referenceVertices = referenceRig.mesh.geometry.getAttribute('position');
  for (let i = 0; i < referenceVertices.count; i++) {
    point.fromBufferAttribute(referenceVertices, i);
    referenceRig.mesh.applyBoneTransform(i, point);
    lowest = Math.min(lowest, point.y);
  }
  if (Math.abs(lowest - 0.002) > 0.000001) {
    p.root.position[1] += 0.002 - lowest;
    applyPose(rig, p);
  }
  const penetration = Math.min(...bodyClearance(rig).map((h) => h.gap));
  let displacement = 0;
  for (const [n, v] of Object.entries(before))
    displacement = Math.max(
      displacement,
      rig.bones[`mixamorig${n}` as keyof typeof rig.bones]
        .getWorldPosition(new Vector3())
        .distanceTo(v as Vector3),
    );
  out.push({
    id: e.id,
    pose: poseSchema.parse(p),
    image: e.images.find((im: any) => im.src === e.hero).id,
    provenance: 'unverified',
    bodyClearance: penetration,
    correctionDistance: displacement,
    review: penetration < -0.005 || displacement > 0.1 ? 'needs-refinement' : 'schematic',
  });
}
writeFileSync(
  new URL('../src/data/brahmachari-models.json', import.meta.url),
  JSON.stringify(out, null, 2) + '\n',
);
console.log(
  `Authored ${out.length} original pose studies; ${out.filter((m) => m.review === 'needs-refinement').length} exceed the geometry correction thresholds.`,
);
console.table(
  out
    .filter((m) => m.review === 'needs-refinement')
    .map((m) => ({
      id: m.id,
      penetration: +m.bodyClearance.toFixed(3),
      correction: +m.correctionDistance.toFixed(3),
    })),
);
