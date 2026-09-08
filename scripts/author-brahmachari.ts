/** Rebuild the 108 static book studies. Source geometry is never passed through
 * the animation collision optimizer: only a uniform floor translation is applied. */
import { readFileSync, writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { makeRig, applyPose, readPose } from '../src/core/rig.ts';
import { bodyClearance } from '../src/core/clearance.ts';
import { poseSchema } from '../src/core/schema.ts';
import { sourceStudies } from './book/source-studies.ts';
const poses = sourceStudies();
const audits = JSON.parse(
  readFileSync(new URL('./book/model-audit.json', import.meta.url), 'utf8'),
);
const book = JSON.parse(
  readFileSync(new URL('../src/data/brahmachari.json', import.meta.url), 'utf8'),
);
const rig = makeRig('human'),
  referenceRig = makeRig('reference'),
  point = new Vector3(),
  out = [];
for (const e of book.entries.filter((e: any) => e.kind === 'posture')) {
  const raw = poses[e.order];
  if (!raw) throw new Error(`Missing ${e.order} ${e.id}`);
  applyPose(rig, raw);
  // Source contacts take precedence over collision-proxy optimization. Diagnose
  // clearance below, but never silently change the authored knee/elbow plane.
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
  const groundOffset = 0.002 - lowest;
  if (Math.abs(lowest - 0.002) > 0.000001) {
    p.root.position[1] += 0.002 - lowest;
    applyPose(rig, p);
  }
  const penetration = Math.min(...bodyClearance(rig).map((h) => h.gap));
  const audit = audits.find((a: any) => a.id === e.id);
  if (!audit || audit.image !== e.images.find((im: any) => im.src === e.hero).id)
    throw new Error(`Missing source audit for ${e.id}`);
  out.push({
    id: e.id,
    pose: poseSchema.parse(p),
    image: e.images.find((im: any) => im.src === e.hero).id,
    provenance: 'unverified',
    bodyClearance: penetration,
    correctionDistance: 0,
    groundOffset,
    audit,
    review: penetration < -0.005 || audit.needsRefinement ? 'needs-refinement' : 'schematic',
  });
}
writeFileSync(
  new URL('../src/data/brahmachari-models.json', import.meta.url),
  JSON.stringify(out, null, 2) + '\n',
);
console.log(
  `Authored ${out.length} original pose studies; ${out.filter((m) => m.review === 'needs-refinement').length} retain explicit source-contact limitations.`,
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
