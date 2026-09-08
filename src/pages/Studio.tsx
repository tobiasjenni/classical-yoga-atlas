import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Euler, Quaternion } from 'three';
import { asanas } from '../data';
import {
  Download,
  Upload,
  Copy,
  FlipHorizontal2,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  Save,
} from 'lucide-react';
import { z } from 'zod';
import { useSearchParams } from 'react-router-dom';
import { boneNames, shortBone, type BoneName } from '../core/bones';
import {
  asanaSchema,
  flowFramesSchema,
  keyframeSchema,
  phases,
  type Asana,
  type Keyframe,
  type Pose,
} from '../core/schema';
import { blankFlow, degrees, mirrorPose } from '../core/motion';
import { exportJSON } from '../core/export';
const Stage = lazy(() => import('../components/Stage'));
const flowSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('asana-flow'),
    keyframes: flowFramesSchema,
  })
  .strict();
const draftKey = 'classical-yoga-atlas-studio-v1';
type Draft = { frames: Keyframe[]; record: Asana | null };
function initial(): Draft {
  try {
    const raw = JSON.parse(localStorage.getItem(draftKey) ?? 'null');
    if (raw && z.array(keyframeSchema).safeParse(raw.frames).success)
      return { frames: raw.frames, record: raw.record ? asanaSchema.parse(raw.record) : null };
  } catch {
    /* A corrupt local draft must not prevent opening the editor. */
  }
  return { frames: blankFlow(), record: null };
}
export default function Studio({ records = asanas }: { records?: Asana[] }) {
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<Draft>(initial),
    [index, setIndex] = useState(0),
    [selected, setSelected] = useState<BoneName>('mixamorigLeftArm');
  const [mode, setMode] = useState<'rotate' | 'ik'>('rotate'),
    [message, setMessage] = useState(''),
    [history, setHistory] = useState<Draft[]>([]),
    [future, setFuture] = useState<Draft[]>([]);
  const input = useRef<HTMLInputElement>(null),
    frame = draft.frames[index] ?? draft.frames[0];
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      setMessage('Local storage is full. Export your draft to keep it.');
    }
  }, [draft]);
  function commit(next: Draft) {
    // An edited endpoint or frame order invalidates its precomputed route.
    next = {
      ...next,
      frames: next.frames.map((f, i) => {
        if (
          !f.path ||
          (JSON.stringify(f.path[0]) === JSON.stringify(next.frames[Math.max(0, i - 1)].pose) &&
            JSON.stringify(f.path.at(-1)) === JSON.stringify(f.pose))
        )
          return f;
        const { path: _path, ...rest } = f;
        return rest;
      }),
    };
    setHistory((h) => [...h.slice(-39), structuredClone(draft)]);
    setFuture([]);
    setDraft(next);
  }
  function updateFrame(patch: Partial<Keyframe>) {
    const syncHold = patch.pose && (frame.phase === 'final' || frame.phase === 'hold');
    const syncNeutral = patch.pose && frame.phase === 'neutral';
    commit({
      ...draft,
      frames: draft.frames.map((f, i) =>
        i === index
          ? { ...f, ...patch }
          : (syncHold && (f.phase === 'final' || f.phase === 'hold')) ||
              (syncNeutral && f.phase === 'neutral')
            ? { ...f, pose: structuredClone(patch.pose!) }
            : f,
      ),
    });
  }
  function updatePose(pose: Pose) {
    updateFrame({ pose });
  }
  const euler = new Euler().setFromQuaternion(
    new Quaternion().fromArray(frame.pose.bones[selected]!),
  );
  function rotate(axis: number, value: number) {
    const angles = [euler.x, euler.y, euler.z].map((v) => (v * 180) / Math.PI);
    angles[axis] = value;
    const pose = structuredClone(frame.pose);
    pose.bones[selected] = degrees(angles[0], angles[1], angles[2]);
    updatePose(pose);
  }
  function load(record: Asana) {
    commit({ frames: structuredClone(record.keyframes), record: structuredClone(record) });
    setIndex(0);
    setMessage(`Loaded ${record.iast}. Your changes are saved as a local draft.`);
  }
  useEffect(() => {
    const record = records.find((a) => a.id === params.get('asana'));
    if (record && draft.record?.id !== record.id) {
      setDraft({ frames: structuredClone(record.keyframes), record: structuredClone(record) });
      setIndex(record.keyframes.findIndex((f) => f.phase === 'final'));
    }
  }, [params, records]);
  function download() {
    const value = draft.record
      ? { ...draft.record, keyframes: draft.frames }
      : { schemaVersion: 1, kind: 'asana-flow', keyframes: draft.frames };
    const parsed = draft.record ? asanaSchema.safeParse(value) : flowSchema.safeParse(value);
    if (!parsed.success) {
      setMessage(`Export blocked: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
      return;
    }
    exportJSON(parsed.data, `${draft.record?.id ?? 'untitled-flow'}.json`);
    setMessage(
      draft.record
        ? 'Validated asana JSON exported.'
        : 'Validated flow exported. Add source metadata before contributing an asana record.',
    );
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error('File exceeds the 5 MB limit.');
      const raw = JSON.parse(await file.text());
      const asana = asanaSchema.safeParse(raw);
      if (asana.success) load(asana.data);
      else {
        const flow = flowSchema.parse(raw);
        commit({ frames: flow.keyframes, record: null });
        setIndex(0);
        setMessage('Validated flow imported.');
      }
    } catch (e) {
      setMessage(`Import failed: ${e instanceof Error ? e.message : 'Invalid JSON'}`);
    }
    if (input.current) input.current.value = '';
  }
  function travel(undo: boolean) {
    const list = undo ? history : future;
    if (!list.length) return;
    const next = list.at(-1)!;
    if (undo) {
      setHistory(history.slice(0, -1));
      setFuture([...future, draft]);
    } else {
      setFuture(future.slice(0, -1));
      setHistory([...history, draft]);
    }
    setDraft(next);
    setIndex(Math.min(index, next.frames.length - 1));
  }
  return (
    <main className="page studio-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE AUTHORING WORKSPACE</div>
          <h1>
            Pose studio<span className="period">.</span>
          </h1>
          <p>Shape a posture. Document its movement. Keep its provenance.</p>
        </div>
        <div className="button-row">
          <button className="button" onClick={() => input.current?.click()}>
            <Upload size={16} /> Import JSON
          </button>
          <button className="button primary" onClick={download}>
            <Download size={16} /> Export JSON
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Import pose JSON"
            onChange={(e) => importFile(e.target.files?.[0])}
          />
        </div>
      </div>
      <div className="studio-toolbar">
        <label>
          Start from an entry{' '}
          <select
            aria-label="Load asana into studio"
            value={draft.record?.id ?? ''}
            onChange={(e) => {
              const a = records.find((a) => a.id === e.target.value);
              if (a) load(a);
            }}
          >
            <option value="">Untitled flow</option>
            {records.map((a) => (
              <option value={a.id} key={a.id}>
                {a.iast}
              </option>
            ))}
          </select>
        </label>
        <span className="save-state">
          <Save size={13} /> Saved on this device
        </span>
        <button
          className="icon-button"
          disabled={!history.length}
          onClick={() => travel(true)}
          aria-label="Undo"
        >
          <Undo2 size={17} />
        </button>
        <button
          className="icon-button"
          disabled={!future.length}
          onClick={() => travel(false)}
          aria-label="Redo"
        >
          <Redo2 size={17} />
        </button>
        <button
          className="button small"
          onClick={() => {
            commit({ frames: blankFlow(), record: null });
            setIndex(0);
          }}
        >
          New flow
        </button>
      </div>
      <div className="studio-layout">
        <aside className="panel bone-panel">
          <div className="panel-title">
            Skeleton <span>22 bones</span>
          </div>
          <div className="segment">
            <button aria-pressed={mode === 'rotate'} onClick={() => setMode('rotate')}>
              FK rotation
            </button>
            <button
              aria-pressed={mode === 'ik'}
              onClick={() => {
                setMode('ik');
                if (!/(Hand|Foot)$/.test(selected)) setSelected('mixamorigLeftHand');
              }}
            >
              Limb IK
            </button>
          </div>
          <div className="bone-list">
            {boneNames
              .filter((b) => mode !== 'ik' || /(Hand|Foot)$/.test(b))
              .map((name) => (
                <button
                  className={selected === name ? 'selected' : ''}
                  key={name}
                  onClick={() => setSelected(name)}
                  aria-pressed={selected === name}
                >
                  {shortBone(name)}
                </button>
              ))}
          </div>
          <button className="button" onClick={() => updatePose(mirrorPose(frame.pose))}>
            <FlipHorizontal2 size={15} /> Mirror pose
          </button>
        </aside>
        <Suspense fallback={<div className="stage loading">Loading studio rig…</div>}>
          <Stage
            pose={frame.pose}
            editor={{ selected, mode, onPose: updatePose }}
            label={`Editing ${shortBone(selected)}`}
          />
        </Suspense>
        <aside className="panel properties">
          <div className="panel-title">
            Keyframe {index + 1}
            <span>Properties</span>
          </div>
          <label>
            Phase
            <select
              value={frame.phase}
              onChange={(e) => updateFrame({ phase: e.target.value as Keyframe['phase'] })}
            >
              {phases.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <div className="field-pair">
            <label>
              Duration (s)
              <input
                type="number"
                min="0.1"
                max="120"
                step="0.1"
                value={frame.duration}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 0.1 && n <= 120) updateFrame({ duration: n });
                }}
              />
            </label>
            <label>
              Breath
              <select
                value={frame.breath ?? 'free'}
                onChange={(e) => updateFrame({ breath: e.target.value as Keyframe['breath'] })}
              >
                {['free', 'inhale', 'exhale', 'retain'].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Easing
            <select
              value={frame.easing}
              onChange={(e) => updateFrame({ easing: e.target.value as Keyframe['easing'] })}
            >
              {['easeInOut', 'linear', 'easeIn', 'easeOut'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Instruction
            <textarea
              value={frame.instruction}
              onChange={(e) => updateFrame({ instruction: e.target.value })}
              rows={3}
            />
          </label>
          <fieldset>
            <legend>{shortBone(selected)} · degrees</legend>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <label className="axis-field" key={axis}>
                {axis}
                <input
                  aria-label={`${axis} rotation`}
                  type="number"
                  min="-180"
                  max="180"
                  step="1"
                  value={Math.round(([euler.x, euler.y, euler.z][i] * 180) / Math.PI)}
                  onChange={(e) => rotate(i, Number(e.target.value))}
                />
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Root position · metres</legend>
            {['X', 'Y', 'Z'].map((axis, i) => (
              <label className="axis-field" key={axis}>
                {axis}
                <input
                  aria-label={`Root ${axis} position`}
                  type="number"
                  step="0.01"
                  value={frame.pose.root.position[i]}
                  onChange={(e) => {
                    const pose = structuredClone(frame.pose);
                    pose.root.position[i] = Number(e.target.value);
                    updatePose(pose);
                  }}
                />
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>Root rotation · degrees</legend>
            {['X', 'Y', 'Z'].map((axis, i) => {
              const r = new Euler().setFromQuaternion(
                new Quaternion().fromArray(frame.pose.root.rotation),
              );
              const a = [r.x, r.y, r.z].map((v) => (v * 180) / Math.PI);
              return (
                <label className="axis-field" key={axis}>
                  {axis}
                  <input
                    aria-label={`Root ${axis} rotation`}
                    type="number"
                    step="1"
                    value={Math.round(a[i])}
                    onChange={(e) => {
                      a[i] = Number(e.target.value);
                      const pose = structuredClone(frame.pose);
                      pose.root.rotation = degrees(a[0], a[1], a[2]);
                      updatePose(pose);
                    }}
                  />
                </label>
              );
            })}
          </fieldset>
          <label className="check-label">
            <input
              type="checkbox"
              checked={frame.jointsUnderLoad.includes(selected)}
              onChange={(e) =>
                updateFrame({
                  jointsUnderLoad: e.target.checked
                    ? [...frame.jointsUnderLoad, selected]
                    : frame.jointsUnderLoad.filter((n) => n !== selected),
                })
              }
            />{' '}
            Highlight this joint
          </label>
          <p className="micro">
            Movements, timing, breath markers and joint highlights are unverified authoring choices.
            IK targets can be dragged in 3D; numeric rotations remain available by keyboard.
          </p>
        </aside>
      </div>
      <section className="timeline panel">
        <div className="panel-title">
          Movement timeline{' '}
          <div className="button-row">
            <button
              className="icon-button"
              aria-label="Duplicate keyframe"
              onClick={() => {
                const frames = [...draft.frames];
                frames.splice(index + 1, 0, { ...structuredClone(frame), id: crypto.randomUUID() });
                commit({ ...draft, frames });
                setIndex(index + 1);
              }}
            >
              <Copy size={15} />
            </button>
            <button
              className="icon-button"
              aria-label="Add transition keyframe"
              onClick={() => {
                const frames = [...draft.frames];
                frames.splice(index + 1, 0, {
                  ...structuredClone(frame),
                  id: crypto.randomUUID(),
                  phase: 'transition',
                });
                commit({ ...draft, frames });
                setIndex(index + 1);
              }}
            >
              <Plus size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Delete keyframe"
              disabled={draft.frames.length < 2}
              onClick={() => {
                commit({ ...draft, frames: draft.frames.filter((_, i) => i !== index) });
                setIndex(Math.max(0, index - 1));
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        <div className="timeline-frames">
          {draft.frames.map((f, i) => (
            <button
              key={f.id}
              aria-pressed={index === i}
              className={index === i ? 'active' : ''}
              onClick={() => setIndex(i)}
            >
              <span>{String(i + 1).padStart(2, '0')}</span>
              <strong>{f.phase}</strong>
              <small>
                {f.duration}s · {f.breath}
              </small>
            </button>
          ))}
        </div>
        <div className="button-row">
          <button
            className="button small"
            disabled={index === 0}
            onClick={() => {
              const frames = [...draft.frames];
              [frames[index - 1], frames[index]] = [frames[index], frames[index - 1]];
              commit({ ...draft, frames });
              setIndex(index - 1);
            }}
          >
            Move earlier
          </button>
          <button
            className="button small"
            disabled={index === draft.frames.length - 1}
            onClick={() => {
              const frames = [...draft.frames];
              [frames[index + 1], frames[index]] = [frames[index], frames[index + 1]];
              commit({ ...draft, frames });
              setIndex(index + 1);
            }}
          >
            Move later
          </button>
        </div>
      </section>
      <p className="status-message" role="status">
        {message ||
          'Drafts save automatically. Final and hold poses are linked, as are both neutral endpoints. Export validates the complete flow.'}
      </p>
    </main>
  );
}
