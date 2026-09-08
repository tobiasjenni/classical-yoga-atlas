import { readFileSync, readdirSync } from 'node:fs';
import { makeRig, applyPose } from '../src/core/rig.ts';
import { bodyClearance } from '../src/core/clearance.ts';
import { duration, sample } from '../src/core/motion.ts';
const rig = makeRig();
const dir = new URL('../src/data/asanas/', import.meta.url);
const rows = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const a = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  let worst = { gap: 0, chain: '', time: 0, body: '' };
  for (let time = 0; time <= duration(a.keyframes); time += 0.2) {
    applyPose(rig, sample(a.keyframes, time));
    for (const hit of bodyClearance(rig))
      if (hit.gap < worst.gap)
        worst = { gap: hit.gap, chain: hit.chain, time, body: hit.obstacle.bone };
  }
  rows.push({
    id: a.id,
    mm: Math.round(worst.gap * 1000),
    time: +worst.time.toFixed(2),
    limb: worst.chain,
    body: worst.body,
  });
}
console.table(rows);
