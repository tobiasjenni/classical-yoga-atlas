/** Editorial reconstruction, not a prescribed practice sequence.
 * World targets, knee/elbow poles and end-effector orientation are authored separately. */
import { Quaternion, Vector3 } from 'three';
import { identity, degrees, blendLimbs } from '../src/core/motion.ts';
import { applyPose, makeRig, orientWorld, readPose, solveTwoBone } from '../src/core/rig.ts';
import { boneNames, type BoneName } from '../src/core/bones.ts';
import type { Pose, Keyframe } from '../src/core/schema.ts';
export { arms, legs, limb, world, orient, seat, lotus, q, handsOnKnees };
type V = [number, number, number];
type Side = 'Left' | 'Right';
const rig = makeRig();
const q = (x = 0, y = 0, z = 0) => new Quaternion().fromArray(degrees(x, y, z));
const palmDown = q(90, 0, 180),
  palmUp = q(-90),
  soleUpLeft = q(180, -80),
  soleUpRight = q(180, 80);
function world(p: Pose, name: BoneName) {
  applyPose(rig, p);
  return rig.bones[name].getWorldPosition(new Vector3());
}
function orient(p: Pose, name: BoneName, rotation: Quaternion) {
  applyPose(rig, p);
  orientWorld(rig, name, rotation);
  return readPose(rig, p);
}
function limb(p: Pose, side: Side, arm: boolean, target: V, pole: V, rotation?: Quaternion): Pose {
  applyPose(rig, p);
  const end = `mixamorig${side}${arm ? 'Hand' : 'Foot'}` as BoneName;
  solveTwoBone(
    rig,
    `mixamorig${side}${arm ? 'Arm' : 'UpLeg'}`,
    `mixamorig${side}${arm ? 'ForeArm' : 'Leg'}`,
    end,
    new Vector3(...target),
    new Vector3(...pole),
    arm ? undefined : 0.085,
  );
  if (rotation) orientWorld(rig, end, rotation);
  return readPose(rig, p);
}
// Intersect the thigh/shin reach circles at a chosen knee height. A lateral pole
// alone can point a deeply folded knee below the floor when the ankle crosses the hip.
function floorKnee(p: Pose, side: Side, target: V, height = 0.085): V {
  const hip = world(p, `mixamorig${side}UpLeg`),
    foot = new Vector3(...target);
  const delta = new Vector3(foot.x - hip.x, 0, foot.z - hip.z),
    d = delta.length();
  const r1 = Math.sqrt(Math.max(0, 0.43 ** 2 - (height - hip.y) ** 2)),
    r2 = Math.sqrt(Math.max(0, 0.4 ** 2 - (height - foot.y) ** 2));
  if (d < 0.001 || d > r1 + r2 || d < Math.abs(r1 - r2))
    return [side === 'Left' ? 0.8 : -0.8, Math.max(height, hip.y), 0.5];
  delta.normalize();
  const along = (r1 * r1 - r2 * r2 + d * d) / (2 * d),
    across = Math.sqrt(Math.max(0, r1 * r1 - along * along));
  const mid = new Vector3(hip.x, height, hip.z).addScaledVector(delta, along);
  const perpendicular = new Vector3(-delta.z, 0, delta.x);
  const a = mid.clone().addScaledVector(perpendicular, across),
    b = mid.clone().addScaledVector(perpendicular, -across);
  if (a.z < hip.z && b.z >= hip.z) return b.toArray();
  if (b.z < hip.z && a.z >= hip.z) return a.toArray();
  return ((side === 'Left' ? a.x > b.x : a.x < b.x) ? a : b).toArray();
}
function legs(p: Pose, left: V, right: V, poles?: [V, V], rotations = [q(-90), q(-90)]) {
  const l = poles?.[0] ?? floorKnee(p, 'Left', left),
    r = poles?.[1] ?? floorKnee(p, 'Right', right);
  return limb(
    limb(p, 'Left', false, left, l, rotations[0]),
    'Right',
    false,
    right,
    r,
    rotations[1],
  );
}
function arms(
  p: Pose,
  left: V,
  right: V,
  poles: [V, V] = [
    [0.65, 0.42, 0.05],
    [-0.65, 0.42, 0.05],
  ],
  rotations = [palmDown, palmDown],
) {
  return limb(
    limb(p, 'Left', true, left, poles[0], rotations[0]),
    'Right',
    true,
    right,
    poles[1],
    rotations[1],
  );
}
function handsOnKnees(p: Pose, up = false) {
  const l = world(p, 'mixamorigLeftLeg')
    .add(new Vector3(0, 0.075, -0.035))
    .toArray();
  const r = world(p, 'mixamorigRightLeg')
    .add(new Vector3(0, 0.075, -0.035))
    .toArray();
  return arms(p, l, r, undefined, up ? [palmUp, palmUp] : undefined);
}
function seated() {
  const p = identity();
  p.root.position = [0, 0.17, 0];
  return arms(
    legs(
      p,
      [0.11, 0.075, 0.8292],
      [-0.11, 0.075, 0.8292],
      [
        [0.12, 0.8, 0.4],
        [-0.12, 0.8, 0.4],
      ],
    ),
    [0.27, 0.12, 0.21],
    [-0.27, 0.12, 0.21],
  );
}
function crossed(left: V = [-0.08, 0.115, 0.34], right: V = [0.08, 0.15, 0.23], height = 0.17) {
  const p = seated();
  p.root.position[1] = height;
  return handsOnKnees(legs(p, left, right, undefined, [q(0, -80, 60), q(0, 80, -60)]));
}
const seat = seated();
let lotus = legs(seat, [0.025, 0.19, 0.14], [-0.025, 0.225, 0.12], undefined, [
  soleUpLeft,
  soleUpRight,
]);
lotus = handsOnKnees(lotus, true);
export const finals: Record<string, Pose> = {};
finals.svastikasana = crossed();
finals.gomukhasana = handsOnKnees(
  legs(
    seat,
    [-0.23, 0.065, 0.02],
    [0.23, 0.075, -0.04],
    [
      [0, 0.12, 0.8],
      [0, 0.34, 0.8],
    ],
    [q(0, -80), q(0, 80)],
  ),
);
finals.virasana = handsOnKnees(structuredClone(lotus));
finals.kurmasana = crossed([-0.065, 0.07, -0.02], [0.065, 0.12, 0.015], 0.21);
let kukkuta = structuredClone(lotus);
kukkuta.root.position[1] = 0.2;
kukkuta.bones.mixamorigSpine = degrees(18);
kukkuta.bones.mixamorigSpine1 = degrees(5);
finals.kukkutasana = arms(
  kukkuta,
  [0.18, 0.035, 0.2],
  [-0.18, 0.035, 0.2],
  [
    [0.18, 0.37, 0.17],
    [-0.18, 0.37, 0.17],
  ],
);
const boundLotus = arms(
  structuredClone(lotus),
  [-0.06, 0.77, -0.105],
  [0.06, 0.795, -0.105],
  [
    [0.5, 0.7, 0.12],
    [-0.5, 0.7, 0.12],
  ],
  [q(0, 0, -80), q(0, 0, 80)],
);
let uttana = structuredClone(boundLotus);
uttana.root.position = [0, 0.16, 0.15];
uttana.root.rotation = degrees(-90);
finals['uttana-kurmasana'] = uttana;
let dhanur = structuredClone(seat);
dhanur.root.rotation = degrees(30);
dhanur.root.position = [0, 0.162, 0.03];
dhanur.bones.mixamorigSpine = degrees(15);
dhanur.bones.mixamorigSpine1 = degrees(0, -8);
dhanur = legs(
  dhanur,
  [0.11, 0.075, 0.8292],
  [-0.14, 0.6, 0.5],
  [
    [0.12, 0.8, 0.4],
    [-0.7, 0.6, 0.4],
  ],
  [q(-90), q(-90)],
);
finals.dhanurasana = arms(
  dhanur,
  [0.11, 0.24, 0.82],
  [-0.14, 0.76, 0.52],
  [
    [0.45, 0.45, 0.53],
    [-0.62, 0.72, 0.22],
  ],
  [q(), q()],
);
let matsya = legs(
  seat,
  [-0.24, 0.045, 0.4],
  [0.06, 0.21, 0.08],
  [[0.06, 0.75, 0.4], floorKnee(seat, 'Right', [0.06, 0.21, 0.08])],
  [q(), soleUpRight],
);
matsya.bones.mixamorigSpine = degrees(0, 12);
matsya.bones.mixamorigSpine1 = degrees(0, 22);
matsya.bones.mixamorigSpine2 = degrees(0, 12);
matsya.bones.mixamorigHead = degrees(0, 15);
finals.matsyendrasana = arms(
  matsya,
  [-0.03, 0.43, 0.31],
  [-0.2, 0.23, -0.04],
  [
    [0.42, 0.43, 0.47],
    [-0.5, 0.35, -0.28],
  ],
);
// Fold primarily from the hip; the straight legs retain their world targets.
let fold = structuredClone(seat);
fold.root.rotation = degrees(62);
fold.root.position = [
  0,
  0.11 + 0.06 * Math.cos((62 * Math.PI) / 180),
  0.06 * Math.sin((62 * Math.PI) / 180),
];
fold.bones.mixamorigSpine = degrees(12);
fold.bones.mixamorigSpine1 = degrees(12);
fold.bones.mixamorigSpine2 = degrees(5);
fold.bones.mixamorigNeck = degrees(-5);
fold = legs(
  fold,
  [0.11, 0.075, 0.8292],
  [-0.11, 0.075, 0.8292],
  [
    [0.12, 0.8, 0.4],
    [-0.12, 0.8, 0.4],
  ],
);
finals.paschimottanasana = arms(
  fold,
  [0.11, 0.24, 0.85],
  [-0.11, 0.24, 0.85],
  [
    [0.4, 0.32, 0.6],
    [-0.4, 0.32, 0.6],
  ],
  [q(), q()],
);
let mayura = identity();
mayura.root.position = [0, 0.29, -0.1];
mayura.root.rotation = degrees(90);
mayura.bones.mixamorigNeck = degrees(-15);
mayura.bones.mixamorigLeftFoot = degrees(90);
mayura.bones.mixamorigRightFoot = degrees(90);
finals.mayurasana = arms(
  mayura,
  [0.13, 0.035, 0.065],
  [-0.13, 0.035, 0.065],
  [
    [0.12, 0.34, 0.02],
    [-0.12, 0.34, 0.02],
  ],
  [q(90), q(90)],
);
let shava = identity();
shava.root.position = [0, 0.12, 0.18];
shava.root.rotation = degrees(-90);
shava.bones.mixamorigLeftArm = degrees(0, 0, 18);
shava.bones.mixamorigRightArm = degrees(0, 0, -18);
shava.bones.mixamorigLeftUpLeg = degrees(0, 0, 7);
shava.bones.mixamorigRightUpLeg = degrees(0, 0, -7);
shava = orient(shava, 'mixamorigLeftHand', q(-90, 0, 18));
shava = orient(shava, 'mixamorigRightHand', q(-90, 0, -18));
finals.shavasana = shava;
finals.siddhasana = crossed([-0.025, 0.11, 0.06], [0.025, 0.21, 0.14]);
finals.siddhasana.bones.mixamorigNeck = degrees(18);
finals.padmasana = arms(lotus, [0.2, 0.18, 0.23], [-0.18, 0.18, 0.23], undefined, [palmUp, palmUp]);
finals.padmasana.bones.mixamorigNeck = degrees(24);
finals.simhasana = handsOnKnees(crossed([-0.065, 0.07, -0.02], [0.065, 0.12, 0.015], 0.21));
finals.simhasana.bones.mixamorigNeck = degrees(8);
finals.bhadrasana = arms(
  legs(seat, [0.045, 0.065, 0.23], [-0.045, 0.065, 0.23], undefined, [q(0, 0, -90), q(0, 0, 90)]),
  [0.065, 0.15, 0.3],
  [-0.065, 0.15, 0.3],
  [
    [0.4, 0.33, 0.3],
    [-0.4, 0.33, 0.3],
  ],
  [q(50, 0, 180), q(50, 0, 180)],
);

type Step = { pose: Pose; text: string; seconds?: number };
function copyChain(p: Pose, source: Pose, side: Side, arm: boolean) {
  const result = structuredClone(p);
  for (const n of boneNames)
    if (n.includes(side) && (arm ? /Shoulder|Arm|Hand/.test(n) : /UpLeg|Leg|Foot|ToeBase/.test(n)))
      result.bones[n] = [...source.bones[n]!];
  return result;
}
function seatedEntry(target: Pose): Step[] {
  // Keep the trunk upright until both feet are placed. Hands move after the legs.
  let p = structuredClone(seat);
  const legTarget = legs(
    seat,
    world(target, 'mixamorigLeftFoot').toArray(),
    world(target, 'mixamorigRightFoot').toArray(),
    [world(target, 'mixamorigLeftLeg').toArray(), world(target, 'mixamorigRightLeg').toArray()],
  );
  for (const side of ['Left', 'Right'] as const) {
    applyPose(rig, target);
    const rotation = rig.bones[`mixamorig${side}Foot`].getWorldQuaternion(new Quaternion());
    Object.assign(legTarget, orient(legTarget, `mixamorig${side}Foot`, rotation));
  }
  const result: Step[] = [];
  for (const side of ['Left', 'Right'] as const) {
    const placed = copyChain(p, legTarget, side, false);
    const start = world(p, `mixamorig${side}Foot`),
      end = world(placed, `mixamorig${side}Foot`);
    if (start.distanceTo(end) < 0.06) continue;
    const waypoint = start.clone().lerp(end, 0.5);
    waypoint.y = Math.max(start.y, end.y) + 0.14;
    waypoint.x += (side === 'Left' ? 1 : -1) * 0.13;
    p = limb(p, side, false, waypoint.toArray(), [side === 'Left' ? 0.8 : -0.8, 0.14, 0.5]);
    result.push({ pose: p, text: `${side} leg lifts and opens; the opposite leg stays in place.` });
    p = placed;
    result.push({ pose: p, text: `${side} foot settles into the proposed placement.` });
  }
  const hands = ['Left', 'Right'].map((side) => world(target, `mixamorig${side}Hand` as BoneName));
  // Reach along the shins before a fold; a still-upright torso cannot reach the toes.
  for (const hand of hands)
    if (hand.z > 0.55) {
      hand.z = 0.43;
      hand.y = Math.max(0.25, hand.y);
    }
  const elbows = [
    world(target, 'mixamorigLeftForeArm').toArray(),
    world(target, 'mixamorigRightForeArm').toArray(),
  ] as [V, V];
  const prepared = arms(p, hands[0].toArray(), hands[1].toArray(), elbows);
  result.push({
    pose: prepared,
    text: 'The hands move into position before the final trunk adjustment.',
  });
  return result;
}
export function authoredFlow(id: string, instruction: string, joints: BoneName[]): Keyframe[] {
  const final = finals[id];
  let start = seat;
  let entry: Step[];
  if (id === 'mayurasana') {
    // Start from a supported crouch instead of rotating a seated body through the floor.
    start = structuredClone(final);
    start.root.position = [0, 0.4, -0.1];
    start.root.rotation = degrees(65);
    start = legs(
      start,
      [0.16, 0.045, -0.66],
      [-0.16, 0.045, -0.66],
      [
        [0.2, 0.04, -0.3],
        [-0.2, 0.04, -0.3],
      ],
      [q(), q()],
    );
    start = arms(
      start,
      [0.13, 0.035, 0.065],
      [-0.13, 0.035, 0.065],
      [
        [0.12, 0.34, 0.02],
        [-0.12, 0.34, 0.02],
      ],
      [q(90), q(90)],
    );
    let lean = structuredClone(final);
    lean = legs(
      lean,
      [0.16, 0.045, -0.66],
      [-0.16, 0.045, -0.66],
      [
        [0.2, 0.06, -0.3],
        [-0.2, 0.06, -0.3],
      ],
      [q(), q()],
    );
    const lift = legs(
      final,
      [0.13, 0.22, -0.75],
      [-0.13, 0.22, -0.75],
      [
        [0.18, 0.15, -0.4],
        [-0.18, 0.15, -0.4],
      ],
      [q(), q()],
    );
    entry = [
      {
        pose: blendLimbs(start, lean, 0.5),
        text: 'The trunk inclines over the hands while the feet remain supported.',
      },
      { pose: lean, text: 'The elbows stay beneath the abdomen; the hands remain planted.' },
      {
        pose: lift,
        text: 'The feet lift clear before the legs extend and the toes point backward.',
      },
    ];
  } else if (id === 'shavasana' || id === 'uttana-kurmasana') {
    if (id === 'shavasana') {
      start = arms(seat, [0.33, 0.035, -0.1], [-0.33, 0.035, -0.1]);
      let recline = structuredClone(start);
      recline.root.rotation = degrees(-38);
      recline.root.position = [0, 0.22, 0.08];
      recline = legs(
        recline,
        [0.11, 0.075, 0.8292],
        [-0.11, 0.075, 0.8292],
        [
          [0.12, 0.8, 0.4],
          [-0.12, 0.8, 0.4],
        ],
      );
      recline = arms(recline, [0.33, 0.035, -0.1], [-0.33, 0.035, -0.1]);
      let low = blendLimbs(recline, final, 0.65);
      entry = [
        { pose: start, text: 'Hands support the model behind the seated trunk.' },
        { pose: recline, text: 'The trunk reclines while both heels and hands remain in place.' },
        { pose: low, text: 'The back lowers and the arms open outward toward the floor.' },
      ];
    } else {
      start = structuredClone(lotus);
      let bound = structuredClone(boundLotus);
      let recline = structuredClone(bound);
      recline.root.rotation = degrees(-45);
      recline.root.position = [0, 0.25, 0.1];
      entry = [
        {
          pose: arms(
            start,
            [0.48, 0.75, 0.12],
            [-0.48, 0.75, 0.12],
            [
              [0.65, 0.55, 0.16],
              [-0.65, 0.55, 0.16],
            ],
          ),
          text: 'The hands open outside the shoulders before passing behind the neck.',
        },
        { pose: bound, text: 'The folded legs stay together as the hands move behind the neck.' },
        {
          pose: recline,
          text: 'The bound shape reclines as one unit; this transition is editorial.',
        },
      ];
    }
  } else if (id === 'kukkutasana') {
    start = structuredClone(lotus);
    let plant = structuredClone(final);
    plant.root.position[1] = 0.16;
    plant = arms(
      plant,
      [0.18, 0.035, 0.2],
      [-0.18, 0.035, 0.2],
      [
        [0.18, 0.37, 0.17],
        [-0.18, 0.37, 0.17],
      ],
    );
    entry = [
      {
        pose: blendLimbs(start, plant, 0.5),
        text: 'The arms descend inside the open knees of the lotus shape.',
      },
      { pose: plant, text: 'Both palms settle on the floor before the body lifts.' },
    ];
  } else entry = seatedEntry(final);
  const frames: Keyframe[] = [];
  function add(phase: Keyframe['phase'], pose: Pose, text: string, seconds = 3) {
    frames.push({
      id: `${phase}-${frames.length + 1}`,
      phase,
      pose,
      instruction: text,
      duration: seconds,
      breath: 'free',
      easing: 'easeInOut',
      interpolation: id === 'uttana-kurmasana' ? 'joint' : 'limb',
      provenance: 'unverified',
      jointsUnderLoad: ['final', 'hold'].includes(phase) ? joints : [],
    });
  }
  add(
    'neutral',
    start,
    'Editorial supported starting position. Colors refer to the model’s left and right.',
    1.5,
  );
  entry.forEach((s, i) => add(i === 0 ? 'prep' : 'transition', s.pose, s.text, s.seconds));
  // A straight-leg fold still needs a distinct preparation and transition.
  if (!frames.some((f) => f.phase === 'transition'))
    add(
      'transition',
      blendLimbs(entry.at(-1)!.pose, final, 0.45),
      'The trunk begins its final adjustment; the feet retain their placement.',
    );
  add('final', final, instruction, 4);
  add('hold', final, 'Still reference shape. Hold time is an editorial display choice.', 6);
  for (const s of entry.slice().reverse())
    add('exit', s.pose, `Reconstructed exit: ${s.text}`, 2.5);
  add('neutral', start, 'The model returns to the supported starting position.', 3);
  return frames;
}
