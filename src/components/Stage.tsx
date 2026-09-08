import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, TransformControls } from '@react-three/drei';
import { Box3, BufferAttribute, BufferGeometry, Group, Vector3 } from 'three';
import { RotateCcw, Maximize2, Minimize2, Plus, Minus } from 'lucide-react';
import { makeRig, applyPose, readPose, solveTwoBone, type Rig } from '../core/rig';
import { shortBone, type BoneName } from '../core/bones';
import type { Pose } from '../core/schema';
import { useAppearance } from '../core/appearance';
import ModelFilter from './ModelFilter';
import { useModalFocus } from '../core/modal-focus';
export type RigEditor = { selected: BoneName; mode: 'rotate' | 'ik'; onPose: (pose: Pose) => void };
export function Mannequin({
  pose,
  getPose,
  joints = [],
  editor,
  guides = false,
}: {
  pose: Pose;
  getPose?: () => Pose;
  joints?: BoneName[];
  editor?: RigEditor;
  guides?: boolean;
}) {
  const style = useAppearance((s) => s.style);
  const rig = useMemo(() => makeRig(style), [style]);
  const invalidate = useThree((s) => s.invalidate);
  const editing = useRef(false);
  useEffect(() => () => rig.mesh.skeleton.dispose(), [rig]);
  const ikTarget = useMemo(() => new Group(), []);
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!editing.current) {
      applyPose(rig, pose);
      invalidate();
    }
  }, [pose, rig, invalidate]);
  useEffect(() => {
    if (editor) {
      ikTarget.position.copy(rig.bones[editor.selected].getWorldPosition(new Vector3()));
      rerender((n) => n + 1);
      invalidate();
    }
  }, [editor?.selected, editor?.mode, pose, rig, ikTarget, invalidate]);
  useFrame(() => {
    if (getPose && !editing.current) applyPose(rig, getPose());
  });
  const end = editor?.selected;
  const ikAllowed = !!end && /(?:Hand|Foot)$/.test(end);
  function updateIK() {
    if (!editor || !ikAllowed) return;
    const side = editor.selected.includes('Left') ? 'Left' : 'Right',
      arm = editor.selected.endsWith('Hand');
    solveTwoBone(
      rig,
      `mixamorig${side}${arm ? 'Arm' : 'UpLeg'}`,
      `mixamorig${side}${arm ? 'ForeArm' : 'Leg'}`,
      editor.selected,
      ikTarget.position,
      new Vector3(side === 'Left' ? 0.8 : -0.8, arm ? 1 : 0.4, arm ? -0.5 : 1),
    );
    invalidate();
  }
  return (
    <>
      <primitive object={rig.group} dispose={null} />
      {guides && <LimbGuides rig={rig} />}
      <primitive object={ikTarget} />
      {joints.map((name) => (
        <JointMarker key={name} rig={rig} name={name} />
      ))}
      {editor && <JointMarker rig={rig} name={editor.selected} selected />}
      {editor && (editor.mode === 'rotate' || ikAllowed) && (
        <TransformControls
          object={editor.mode === 'ik' ? ikTarget : rig.bones[editor.selected]}
          mode={editor.mode === 'ik' ? 'translate' : 'rotate'}
          space={editor.mode === 'ik' ? 'world' : 'local'}
          size={0.8}
          onMouseDown={() => {
            editing.current = true;
          }}
          onObjectChange={editor.mode === 'ik' ? updateIK : undefined}
          onMouseUp={() => {
            editing.current = false;
            editor.onPose(readPose(rig, pose));
          }}
        />
      )}
    </>
  );
}
function LimbGuides({ rig }: { rig: Rig }) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(24 * 3), 3));
    return g;
  }, []);
  const labels = useRef<(Group | null)[]>([]);
  const ends: BoneName[] = [
    'mixamorigLeftHand',
    'mixamorigRightHand',
    'mixamorigLeftFoot',
    'mixamorigRightFoot',
  ];
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => {
    const attr = geometry.getAttribute('position');
    let i = 0;
    for (const side of ['Left', 'Right']) {
      for (const chain of [
        ['Arm', 'ForeArm', 'Hand'],
        ['UpLeg', 'Leg', 'Foot'],
      ]) {
        for (let j = 0; j < 2; j++) {
          for (const name of [chain[j], chain[j + 1]]) {
            const p = rig.bones[`mixamorig${side}${name}` as BoneName].getWorldPosition(
              new Vector3(),
            );
            attr.setXYZ(i++, p.x, p.y, p.z);
          }
        }
      }
    }
    geometry.setDrawRange(0, i);
    attr.needsUpdate = true;
    ends.forEach((name, j) =>
      labels.current[j]?.position.copy(rig.bones[name].getWorldPosition(new Vector3())),
    );
  });
  return (
    <>
      <lineSegments geometry={geometry} renderOrder={5} frustumCulled={false}>
        <lineBasicMaterial color="#172f38" depthTest={false} transparent opacity={0.85} />
      </lineSegments>
      {ends.map((name, i) => (
        <group
          key={name}
          ref={(el) => {
            labels.current[i] = el;
          }}
        >
          <Html center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
            <span
              className={`limb-label ${name.includes('Left') ? 'left' : 'right'} ${name.endsWith('Hand') ? 'wrist' : 'ankle'}`}
            >
              {name.includes('Left') ? 'L' : 'R'} {name.endsWith('Hand') ? 'wrist' : 'ankle'}
            </span>
          </Html>
        </group>
      ))}
    </>
  );
}
function JointMarker({
  rig,
  name,
  selected = false,
}: {
  rig: Rig;
  name: BoneName;
  selected?: boolean;
}) {
  const ref = useRef<Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.position.copy(rig.bones[name].getWorldPosition(new Vector3()));
  });
  useEffect(() => {
    if (ref.current) ref.current.position.copy(rig.bones[name].getWorldPosition(new Vector3()));
  });
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[selected ? 0.031 : 0.036, 12, 8]} />
        <meshBasicMaterial
          color={selected ? '#c77940' : '#d98b55'}
          transparent
          opacity={0.85}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}
export function Lighting() {
  return (
    <>
      <ambientLight intensity={1.45} />
      <directionalLight position={[3, 5, 4]} intensity={2.5} color="#fff1dc" />
      <directionalLight position={[-3, 2, -2]} intensity={1.2} color="#d5e2de" />
    </>
  );
}
export function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[1.15, 64]} />
        <meshStandardMaterial color="#c5c9b8" roughness={1} transparent opacity={0.28} />
      </mesh>
      <gridHelper
        args={[2.6, 16, '#aeb39f', '#c2c6b7']}
        position={[0, -0.025, 0]}
        onUpdate={(grid) => {
          for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) {
            material.transparent = true;
            material.opacity = 0.28;
          }
        }}
      />
    </>
  );
}
function CameraSetup({
  angle,
  reset,
  zoom,
  poses,
}: {
  angle: string;
  reset: number;
  zoom: number;
  poses: Pose[];
}) {
  const controls = useRef<any>(null);
  const { camera, invalidate, size } = useThree();
  const bounds = useMemo(() => {
    const rig = makeRig(),
      box = new Box3();
    for (const pose of poses) {
      applyPose(rig, pose);
      for (const bone of Object.values(rig.bones))
        box.expandByPoint(bone.getWorldPosition(new Vector3()));
    }
    rig.mesh.skeleton.dispose();
    box.expandByScalar(0.16);
    return {
      center: box.getCenter(new Vector3()),
      radius: box.getSize(new Vector3()).length() / 2,
    };
  }, [poses]);
  useEffect(() => {
    const positions: Record<string, [number, number, number]> = {
      front: [0, 0.1, 1],
      side: [1, 0.1, 0],
      back: [0, 0.1, -1],
      top: [0, 1, 0.001],
      'three-quarter': [0.85, 0.65, 1],
    };
    const halfFov = (17 * Math.PI) / 180;
    const limitingFov = Math.atan(Math.tan(halfFov) * Math.min(1, size.width / size.height));
    const distance = (bounds.radius / Math.sin(limitingFov)) * 1.02 * zoom;
    camera.position
      .fromArray(positions[angle])
      .normalize()
      .multiplyScalar(distance)
      .add(bounds.center);
    camera.lookAt(bounds.center);
    if (controls.current) {
      controls.current.target.copy(bounds.center);
      controls.current.update();
    }
    invalidate();
  }, [angle, reset, zoom, camera, invalidate, bounds, size.width, size.height]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      minDistance={1.2}
      maxDistance={8}
      enableDamping={false}
    />
  );
}
export class SceneBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="scene-error" role="status">
        3D is unavailable on this device. Source records and keyframe instructions remain
        accessible.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Stage({
  pose,
  getPose,
  joints,
  editor,
  framingPoses,
  label = 'Interactive asana model',
}: {
  pose: Pose;
  getPose?: () => Pose;
  joints?: BoneName[];
  editor?: RigEditor;
  framingPoses?: Pose[];
  label?: string;
}) {
  const [angle, setAngle] = useState('three-quarter'),
    [reset, setReset] = useState(0);
  const [guides, setGuides] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const surface = useRef<HTMLDivElement>(null);
  useModalFocus(expanded, surface, () => setExpanded(false));
  const initial = useRef([pose]);
  return (
    <div
      ref={surface}
      className={`stage${expanded ? ' stage-expanded' : ''}`}
      role={expanded ? 'dialog' : 'group'}
      aria-modal={expanded || undefined}
      tabIndex={-1}
      aria-label={label}
    >
      <div className="stage-top">
        <span className="eyebrow">
          <span className="live-dot" /> 3D REFERENCE
        </span>
        <span className="stage-hint">Drag to orbit · scroll to zoom</span>
      </div>
      <div className="limb-tools">
        <ModelFilter />
        <span>
          <i className="left-dot" /> Left <i className="right-dot" /> Right{' '}
          <small>reference colors</small>
        </span>
        <button aria-pressed={guides} onClick={() => setGuides(!guides)}>
          Limb X-ray {guides ? 'on' : 'off'}
        </button>
      </div>
      <SceneBoundary>
        <Canvas
          frameloop={getPose ? 'always' : 'demand'}
          dpr={[1, 1.5]}
          camera={{ position: [2.8, 2, 3.5], fov: 34 }}
          gl={{ antialias: true, alpha: true }}
          aria-label={label}
        >
          <Suspense fallback={null}>
            <Lighting />
            <Ground />
            <Mannequin
              pose={pose}
              getPose={getPose}
              joints={joints}
              editor={editor}
              guides={guides}
            />
            <CameraSetup
              angle={angle}
              reset={reset}
              zoom={zoom}
              poses={framingPoses ?? initial.current}
            />
          </Suspense>
        </Canvas>
      </SceneBoundary>
      <div className="camera-controls">
        {['front', 'side', 'back', 'top', 'three-quarter'].map((a) => (
          <button key={a} aria-pressed={angle === a} onClick={() => setAngle(a)}>
            {a === 'three-quarter' ? '¾ view' : a}
          </button>
        ))}
        <button
          aria-label="Zoom in"
          disabled={zoom <= 0.6}
          onClick={() => setZoom((n) => Math.max(0.6, n - 0.2))}
        >
          <Plus size={15} />
        </button>
        <button
          aria-label="Zoom out"
          disabled={zoom >= 2}
          onClick={() => setZoom((n) => Math.min(2, n + 0.2))}
        >
          <Minus size={15} />
        </button>
        <button
          onClick={() => {
            initial.current = [pose];
            setZoom(1);
            setReset((n) => n + 1);
          }}
          aria-label="Reset camera"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Close enlarged model' : 'Enlarge model'}
          aria-pressed={expanded}
        >
          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
      {joints && joints.length > 0 && (
        <span className="anatomy-legend">
          ● Author-selected joints: {joints.map(shortBone).join(', ')} · unverified
        </span>
      )}
    </div>
  );
}
