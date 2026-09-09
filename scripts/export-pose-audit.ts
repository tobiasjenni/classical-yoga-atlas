import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Matrix4, Vector3 } from 'three';
import { createHash } from 'node:crypto';
import { makeRig, applyPose } from '../src/core/rig.ts';
import { poseSchema } from '../src/core/schema.ts';
const out = resolve(process.argv[2] || '../../work/pose-audit');
mkdirSync(out, { recursive: true });
const hyp = process.argv[4] === 'hyp';
const hypEntries = hyp
  ? readdirSync('tests/fixtures/retired-hyp')
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f, i) => {
        const entry = JSON.parse(readFileSync(resolve('tests/fixtures/retired-hyp', f), 'utf8'));
        return { ...entry, order: i + 1, name: entry.iast };
      })
  : [];
const models = hyp
  ? hypEntries.map((e) => ({
      id: e.id,
      pose: e.keyframes.find((f: any) => f.phase === 'final').pose,
      image: 'HYP 1.' + e.source[0].verse,
    }))
  : JSON.parse(readFileSync('src/data/brahmachari-models.json', 'utf8'));
const book = hyp
  ? { entries: hypEntries }
  : JSON.parse(readFileSync('src/data/brahmachari.json', 'utf8'));
const style = process.argv[3] || 'human';
if (style !== 'human' && style !== 'reference') throw new Error('Expected human or reference');
const rig = makeRig(style);
const geo = rig.mesh.geometry;
const index = Uint32Array.from(geo.index!.array);
const color = Float32Array.from(geo.getAttribute('color').array);
writeFileSync(resolve(out, 'indices.bin'), Buffer.from(index.buffer));
writeFileSync(resolve(out, 'colors.bin'), Buffer.from(color.buffer));
const vertices = geo.getAttribute('position');
const normals = geo.getAttribute('normal');
writeFileSync(
  resolve(out, 'rest.normals.bin'),
  Buffer.from(Float32Array.from(normals.array).buffer),
);
const skinIndex = geo.getAttribute('skinIndex');
const skinWeight = geo.getAttribute('skinWeight');
writeFileSync(resolve(out, 'rest.bin'), Buffer.from(Float32Array.from(vertices.array).buffer));
const point = new Vector3();
const normal = new Vector3();
const skinMatrix = new Matrix4();
const boneMatrix = new Matrix4();
const inventory = [];
for (const model of models) {
  applyPose(rig, poseSchema.parse(model.pose));
  rig.mesh.skeleton.update();
  const data = new Float32Array(vertices.count * 3);
  const posedNormals = new Float32Array(vertices.count * 3);
  for (let i = 0; i < vertices.count; i++) {
    point.fromBufferAttribute(vertices, i);
    rig.mesh.applyBoneTransform(i, point);
    data.set(point.toArray(), i * 3);
    // Match Three.js skinnormal_vertex, including its weighted skin matrix.
    skinMatrix.elements.fill(0);
    for (let j = 0; j < 4; j++) {
      const weight = skinWeight.getComponent(i, j);
      if (!weight) continue;
      const bone = skinIndex.getComponent(i, j);
      boneMatrix.multiplyMatrices(
        rig.mesh.skeleton.bones[bone].matrixWorld,
        rig.mesh.skeleton.boneInverses[bone],
      );
      for (let k = 0; k < 16; k++) skinMatrix.elements[k] += boneMatrix.elements[k] * weight;
    }
    skinMatrix.premultiply(rig.mesh.bindMatrixInverse).multiply(rig.mesh.bindMatrix);
    normal.fromBufferAttribute(normals, i).transformDirection(skinMatrix);
    posedNormals.set(normal.toArray(), i * 3);
  }
  writeFileSync(resolve(out, model.id + '.bin'), Buffer.from(data.buffer));
  writeFileSync(resolve(out, model.id + '.normals.bin'), Buffer.from(posedNormals.buffer));
  const entry = book.entries.find((e: any) => e.id === model.id);
  inventory.push({
    id: model.id,
    order: entry.order,
    name: entry.name,
    image: entry.hero ? resolve('public' + entry.hero) : null,
    imageId: model.image,
    style,
    meshSha256: createHash('sha256').update(Buffer.from(data.buffer)).digest('hex'),
    joints: Object.fromEntries(
      Object.entries(rig.bones).map(([name, bone]) => [
        name.replace('mixamorig', ''),
        bone.getWorldPosition(new Vector3()).toArray(),
      ]),
    ),
  });
}
writeFileSync(resolve(out, 'inventory.json'), JSON.stringify(inventory));
console.log(
  `Exported ${models.length} ${style} posed meshes (${vertices.count} vertices each) to ${out}`,
);
