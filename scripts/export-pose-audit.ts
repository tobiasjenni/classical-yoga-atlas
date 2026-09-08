import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from 'three';
import { makeRig, applyPose } from '../src/core/rig.ts';
import { poseSchema } from '../src/core/schema.ts';
const out = resolve(process.argv[2] || '../../work/pose-audit');
mkdirSync(out, { recursive: true });
const models = JSON.parse(readFileSync('src/data/brahmachari-models.json', 'utf8'));
const book = JSON.parse(readFileSync('src/data/brahmachari.json', 'utf8'));
const rig = makeRig('human');
const geo = rig.mesh.geometry;
const index = Uint32Array.from(geo.index!.array);
const color = Float32Array.from(geo.getAttribute('color').array);
writeFileSync(resolve(out, 'indices.bin'), Buffer.from(index.buffer));
writeFileSync(resolve(out, 'colors.bin'), Buffer.from(color.buffer));
const vertices = geo.getAttribute('position');
const point = new Vector3();
const inventory = [];
for (const model of models) {
  applyPose(rig, poseSchema.parse(model.pose));
  rig.mesh.skeleton.update();
  const data = new Float32Array(vertices.count * 3);
  for (let i = 0; i < vertices.count; i++) {
    point.fromBufferAttribute(vertices, i);
    rig.mesh.applyBoneTransform(i, point);
    data.set(point.toArray(), i * 3);
  }
  writeFileSync(resolve(out, model.id + '.bin'), Buffer.from(data.buffer));
  const entry = book.entries.find((e: any) => e.id === model.id);
  inventory.push({
    id: model.id,
    order: entry.order,
    name: entry.name,
    image: resolve('public' + entry.hero),
    imageId: model.image,
    joints: Object.fromEntries(
      Object.entries(rig.bones).map(([name, bone]) => [
        name.replace('mixamorig', ''),
        bone.getWorldPosition(new Vector3()).toArray(),
      ]),
    ),
  });
}
writeFileSync(resolve(out, 'inventory.json'), JSON.stringify(inventory));
console.log(`Exported ${models.length} posed meshes (${vertices.count} vertices each) to ${out}`);
