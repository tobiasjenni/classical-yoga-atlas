import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { makeRig, applyPose } from '../src/core/rig.ts';
import { duration, sample } from '../src/core/motion.ts';
import { asanaSchema } from '../src/core/schema.ts';
const rig = makeRig(),
  point = new Vector3();
const position = rig.mesh.geometry.getAttribute('position');
const skin = rig.mesh.geometry.getAttribute('skinIndex');
const dir = new URL('../src/data/asanas/', import.meta.url);
const rows = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const a = asanaSchema.parse(JSON.parse(readFileSync(new URL(file, dir), 'utf8')));
  let lowest = Infinity,
    at = 0,
    bone = '';
  for (let time = 0; time <= duration(a.keyframes); time += 0.25) {
    applyPose(rig, sample(a.keyframes, time));
    rig.mesh.skeleton.update();
    for (let i = 0; i < position.count; i += 3) {
      point.fromBufferAttribute(position, i);
      rig.mesh.applyBoneTransform(i, point);
      if (point.y < lowest) {
        lowest = point.y;
        at = time;
        bone = rig.mesh.skeleton.bones[skin.getX(i)].name;
      }
    }
  }
  applyPose(rig, a.keyframes.find((f) => f.phase === 'final')!.pose);
  const landmarks = Object.fromEntries(
    [
      'LeftLeg',
      'RightLeg',
      'LeftFoot',
      'RightFoot',
      'LeftHand',
      'RightHand',
      'LeftForeArm',
      'RightForeArm',
      'Head',
    ].map((n) => [
      n,
      rig.bones[`mixamorig${n}` as keyof typeof rig.bones]
        .getWorldPosition(new Vector3())
        .toArray()
        .map((v) => +v.toFixed(3)),
    ]),
  );
  rows.push({ id: a.id, lowest: +lowest.toFixed(4), time: at, bone, landmarks });
}
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(rows, null, 2));
console.table(rows.map(({ landmarks: _landmarks, ...row }) => row));
if (rows.some((row) => row.lowest < -0.002)) process.exitCode = 1;
