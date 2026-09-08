// Original procedural human mesh; no remote assets or third-party model licence.
import { Bone, BufferGeometry, BufferAttribute, Color, SphereGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { boneNames, type BoneName } from './bones.ts';
export function humanGeometry(bones: Record<BoneName, Bone>) {
  const parts: BufferGeometry[] = [];
  const skin = '#c69371',
    shirt = '#627f79',
    shorts = '#344d55',
    hair = '#332c29';
  function attributes(g: BufferGeometry, colors: number[], indices: number[], weights: number[]) {
    g.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
    g.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(indices), 4));
    g.setAttribute('skinWeight', new BufferAttribute(new Float32Array(weights), 4));
    parts.push(g);
  }
  function shape(name: BoneName, offset: number[], scale: number[], color = skin) {
    const g = new SphereGeometry(1, 24, 16);
    g.scale(scale[0], scale[1], scale[2]);
    const origin = bones[name].getWorldPosition(new Vector3());
    g.translate(origin.x + offset[0], origin.y + offset[1], origin.z + offset[2]);
    const c = new Color(color).toArray(),
      count = g.getAttribute('position').count;
    const colors: number[] = [],
      indices: number[] = [],
      weights: number[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(...c);
      indices.push(boneNames.indexOf(name), 0, 0, 0);
      weights.push(1, 0, 0, 0);
    }
    attributes(g, colors, indices, weights);
  }
  type Ring = [number, number, number];
  function surface(
    origin: Vector3,
    rings: Ring[],
    joints: { name: BoneName; y: number }[],
    palette: (y: number) => string,
  ) {
    const p: number[] = [],
      uv: number[] = [],
      colors: number[] = [],
      indices: number[] = [],
      weights: number[] = [],
      tri: number[] = [];
    const slices = 32;
    for (let row = 0; row < rings.length; row++) {
      const [y, rx, rz] = rings[row];
      let i = 0;
      while (i < joints.length - 2 && y > joints[i + 1].y) i++;
      const blend = Math.max(0, Math.min(1, (y - joints[i].y) / (joints[i + 1].y - joints[i].y)));
      const c = new Color(palette(y)).toArray();
      for (let column = 0; column <= slices; column++) {
        const a = (column / slices) * Math.PI * 2;
        p.push(origin.x + Math.cos(a) * rx, origin.y + y, origin.z + Math.sin(a) * rz);
        uv.push(column / slices, row / (rings.length - 1));
        colors.push(...c);
        indices.push(
          boneNames.indexOf(joints[i].name),
          boneNames.indexOf(joints[i + 1].name),
          0,
          0,
        );
        weights.push(1 - blend, blend, 0, 0);
        if (row < rings.length - 1 && column < slices) {
          const n = row * (slices + 1) + column;
          tri.push(n, n + slices + 1, n + 1, n + 1, n + slices + 1, n + slices + 2);
        }
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(p), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
    g.setIndex(tri);
    g.computeVertexNormals();
    attributes(g, colors, indices, weights);
  }
  const hips = bones.mixamorigHips.getWorldPosition(new Vector3());
  // Close the pelvis beneath the shirt when the thighs fold away from it.
  shape('mixamorigHips', [0, 0, 0], [0.142, 0.112, 0.093], shorts);
  surface(
    hips,
    [
      [-0.1, 0.07, 0.045],
      [-0.07, 0.12, 0.075],
      [0, 0.145, 0.095],
      [0.08, 0.132, 0.085],
      [0.14, 0.113, 0.079],
      [0.22, 0.12, 0.082],
      [0.3, 0.145, 0.087],
      [0.39, 0.171, 0.089],
      [0.45, 0.17, 0.078],
      [0.49, 0.135, 0.065],
      [0.53, 0.046, 0.043],
    ],
    [
      { name: 'mixamorigHips', y: 0 },
      { name: 'mixamorigSpine', y: 0.12 },
      { name: 'mixamorigSpine1', y: 0.26 },
      { name: 'mixamorigSpine2', y: 0.4 },
      { name: 'mixamorigNeck', y: 0.55 },
    ],
    (y) => (y < 0.1 ? shorts : shirt),
  );
  shape('mixamorigNeck', [0, 0.04, 0], [0.041, 0.075, 0.043]);
  shape('mixamorigHead', [0, 0.084, -0.004], [0.087, 0.124, 0.093]);
  shape('mixamorigHead', [0, 0.025, 0.024], [0.064, 0.063, 0.071]);
  shape('mixamorigHead', [0, 0.07, 0.09], [0.014, 0.023, 0.022]);
  shape('mixamorigHead', [0, 0.033, 0.091], [0.021, 0.003, 0.004], '#865348');
  shape('mixamorigHead', [0, 0.147, -0.025], [0.091, 0.074, 0.086], hair);
  for (const side of ['Left', 'Right'] as const) {
    const s = side === 'Left' ? 1 : -1;
    shape('mixamorigHead', [s * 0.084, 0.075, 0], [0.014, 0.028, 0.014]);
    shape('mixamorigHead', [s * 0.032, 0.104, 0.08], [0.015, 0.008, 0.008], '#f5e9d8');
    shape('mixamorigHead', [s * 0.032, 0.104, 0.087], [0.005, 0.006, 0.004], '#323a36');
    shape('mixamorigHead', [s * 0.032, 0.119, 0.08], [0.017, 0.003, 0.005], hair);
    shape(`mixamorig${side}Shoulder`, [s * 0.06, 0, 0], [0.085, 0.051, 0.059], shirt);
    const arm = `mixamorig${side}Arm` as BoneName,
      forearm = `mixamorig${side}ForeArm` as BoneName;
    surface(
      bones[arm].getWorldPosition(new Vector3()),
      [
        [-0.62, 0.024, 0.023],
        [-0.56, 0.03, 0.03],
        [-0.46, 0.04, 0.039],
        [-0.38, 0.035, 0.036],
        [-0.34, 0.033, 0.034],
        [-0.32, 0.034, 0.035],
        [-0.3, 0.035, 0.036],
        [-0.26, 0.044, 0.045],
        [-0.15, 0.049, 0.05],
        [-0.04, 0.047, 0.049],
        [0.025, 0.029, 0.031],
      ],
      [
        { name: forearm, y: -0.37 },
        { name: arm, y: -0.27 },
      ],
      (y) => (y > -0.055 ? shirt : skin),
    );
    shape(arm, [0, -0.015, 0], [0.049, 0.05, 0.051], shirt);
    const thigh = `mixamorig${side}UpLeg` as BoneName,
      shin = `mixamorig${side}Leg` as BoneName;
    surface(
      bones[thigh].getWorldPosition(new Vector3()),
      [
        [-0.83, 0.027, 0.029],
        [-0.76, 0.03, 0.032],
        [-0.66, 0.042, 0.044],
        [-0.55, 0.049, 0.051],
        [-0.48, 0.043, 0.046],
        [-0.44, 0.04, 0.042],
        [-0.43, 0.042, 0.044],
        [-0.4, 0.044, 0.046],
        [-0.34, 0.052, 0.055],
        [-0.22, 0.065, 0.069],
        [-0.1, 0.069, 0.071],
        [-0.015, 0.057, 0.061],
        [0.02, 0.035, 0.045],
      ],
      [
        { name: shin, y: -0.49 },
        { name: thigh, y: -0.37 },
      ],
      (y) => (y > -0.16 ? shorts : skin),
    );
    const hand = `mixamorig${side}Hand` as BoneName;
    shape(forearm, [0, 0, 0], [0.034, 0.036, 0.035]);
    shape(shin, [0, 0, 0], [0.041, 0.043, 0.044]);
    shape(hand, [0, -0.035, 0], [0.033, 0.048, 0.016]);
    for (let finger = 0; finger < 4; finger++)
      shape(
        hand,
        [(finger - 1.5) * 0.018, -0.092 + Math.abs(finger - 1.5) * 0.007, 0],
        [0.007, 0.037, 0.009],
      );
    shape(hand, [-s * 0.035, -0.04, 0.004], [0.011, 0.029, 0.013]);
    const foot = `mixamorig${side}Foot` as BoneName;
    shape(foot, [0, -0.008, 0.019], [0.032, 0.031, 0.051]);
    shape(foot, [0, -0.016, 0.079], [0.042, 0.024, 0.071]);
    for (let toe = 0; toe < 5; toe++)
      shape(
        foot,
        [(toe - 2) * 0.016, -0.016, 0.13 - Math.abs(toe - 1) * 0.004],
        [0.008, 0.015, 0.024],
      );
  }
  const geometry = mergeGeometries(parts)!;
  parts.forEach((g) => g.dispose());
  return geometry;
}
