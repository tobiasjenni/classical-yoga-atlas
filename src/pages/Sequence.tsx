import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  GripVertical,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { asanas, byId, normalizeSearch } from '../data';
import { sequenceSchema, type Keyframe } from '../core/schema';
import { exportJSON } from '../core/export';
import FlowPlayer, { FlowScene, useFlow } from '../components/FlowPlayer';
import { duration } from '../core/motion';
type Item = { key: string; id: string };
function initial() {
  try {
    const value = sequenceSchema.parse(
      JSON.parse(localStorage.getItem('atlas-sequence-v1') ?? 'null'),
    );
    if (value.asanas.every((id) => byId[id])) return value;
  } catch {
    /* Invalid drafts do not prevent opening. */
  }
  return { name: 'Untitled reference sequence', asanas: [] as string[], transitionSeconds: 2 };
}
export default function Sequence() {
  const [saved] = useState(initial),
    [items, setItems] = useState<Item[]>(
      saved.asanas.map((id) => ({ id, key: crypto.randomUUID() })),
    ),
    [name, setName] = useState(saved.name),
    [transitionSeconds, setTransition] = useState(saved.transitionSeconds),
    [query, setQuery] = useState(''),
    [message, setMessage] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const value = useMemo(
    () => ({
      schemaVersion: 1 as const,
      kind: 'reference-sequence' as const,
      name,
      provenance: 'unverified' as const,
      transitionSeconds,
      asanas: items.map((i) => i.id),
    }),
    [name, transitionSeconds, items],
  );
  useEffect(() => {
    try {
      localStorage.setItem('atlas-sequence-v1', JSON.stringify(value));
    } catch {
      setMessage('Unable to save locally. Export to keep your sequence.');
    }
  }, [value]);
  function add(id: string, at = items.length) {
    if (!byId[id]) return;
    if (items.length >= 40) {
      setMessage('A sequence can contain up to 40 entries.');
      return;
    }
    const next = [...items];
    next.splice(at, 0, { id, key: crypto.randomUUID() });
    setItems(next);
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setItems(next);
  }
  function drop(e: React.DragEvent, at: number) {
    e.preventDefault();
    e.stopPropagation();
    const key = e.dataTransfer.getData('application/x-atlas-sequence');
    const id = e.dataTransfer.getData('application/x-atlas-asana');
    if (key) {
      const from = items.findIndex((i) => i.key === key);
      if (from >= 0) move(from, Math.min(at, items.length - 1));
    } else if (id) add(id, at);
  }
  async function importSequence(selected?: File) {
    if (!selected) return;
    try {
      if (selected.size > 1_000_000) throw new Error('File exceeds 1 MB.');
      const s = sequenceSchema.parse(JSON.parse(await selected.text()));
      if (s.asanas.length > 40 || s.asanas.some((id) => !byId[id]))
        throw new Error('Unknown asana or more than 40 entries.');
      setName(s.name);
      setTransition(s.transitionSeconds);
      setItems(s.asanas.map((id) => ({ id, key: crypto.randomUUID() })));
      setMessage('Sequence imported.');
    } catch (e) {
      setMessage(`Import failed: ${e instanceof Error ? e.message : 'Invalid file'}`);
    }
    if (file.current) file.current.value = '';
  }
  return (
    <main className="page sequence-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR REFERENCE WORKSPACE</span>
          <h1>
            A sequence of study<span className="period">.</span>
          </h1>
          <p>Arrange postures to explore their forms and transitions.</p>
        </div>
        <div className="button-row">
          <button className="button" onClick={() => file.current?.click()}>
            <Upload size={15} /> Import
          </button>
          <input
            ref={file}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            aria-label="Import sequence JSON"
            onChange={(e) => importSequence(e.target.files?.[0])}
          />
          <button
            className="button primary"
            disabled={!items.length || !name.trim()}
            onClick={() => {
              exportJSON(sequenceSchema.parse(value), 'reference-sequence.json');
              setMessage('Validated sequence exported.');
            }}
          >
            <Download size={15} /> Export sequence
          </button>
        </div>
      </div>
      <div className="sequence-layout">
        <aside className="panel sequence-library">
          <div className="panel-title">
            The collection <span>Drag or add</span>
          </div>
          <div className="search-field">
            <Search size={15} />
            <input
              aria-label="Search sequence library"
              placeholder="Find a posture…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="library-list">
            {asanas
              .filter((a) =>
                normalizeSearch(`${a.iast} ${a.english} ${a.sanskrit}`).includes(
                  normalizeSearch(query),
                ),
              )
              .map((a) => (
                <div
                  className="library-item"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-atlas-asana', a.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  key={a.id}
                >
                  <GripVertical size={14} />
                  <div>
                    <strong>{a.iast}</strong>
                    <small>
                      {a.family} · HYP 1.{a.source[0].verse}
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Add ${a.iast}`}
                    onClick={() => add(a.id)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
              ))}
          </div>
        </aside>
        <section className="sequence-workspace">
          <div className="sequence-settings">
            <label>
              Sequence name
              <input
                aria-label="Sequence name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Transition (s)
              <input
                type="number"
                aria-label="Transition seconds"
                min="0.1"
                max="30"
                step="0.5"
                value={transitionSeconds}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 0.1 && n <= 30) setTransition(n);
                }}
              />
            </label>
          </div>
          <div
            className="sequence-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(e, items.length)}
            aria-label="Ordered sequence"
          >
            <div className="panel-title">
              Your sequence <span>{items.length} postures</span>
            </div>
            {items.length === 0 && (
              <div className="empty-state">
                <Plus size={30} />
                <h2>Begin with a posture</h2>
                <p>
                  Drag an entry here, or use its + button.
                  <br />
                  Reorder with the arrow buttons on any device.
                </p>
              </div>
            )}
            {items.map((item, i) => (
              <div
                key={item.key}
                className="sequence-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-atlas-sequence', item.key);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => drop(e, i)}
              >
                <GripVertical size={15} />
                <span className="sequence-number">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{byId[item.id].iast}</strong>
                  <small>{byId[item.id].english}</small>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Move ${byId[item.id].iast} earlier`}
                  disabled={!i}
                  onClick={() => move(i, i - 1)}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Move ${byId[item.id].iast} later`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove ${byId[item.id].iast}`}
                  onClick={() => setItems(items.filter((_, n) => n !== i))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <SequencePreview items={items} transitionSeconds={transitionSeconds} />
          )}
        </section>
      </div>
      <p className="status-message" role="status">
        {message}
      </p>
      <div className="interpretation-note">
        <span className="unverified-tag">EDITORIAL SEQUENCE · UNVERIFIED</span>
        <p>
          This arrangement is a study aid. It is not an attested classical sequence or a practice
          prescription. Transitions are interpolated reconstructions.
        </p>
      </div>
    </main>
  );
}
function SequencePreview({
  items,
  transitionSeconds,
}: {
  items: Item[];
  transitionSeconds: number;
}) {
  const frames = useMemo(() => {
    const all: Keyframe[] = [];
    items.forEach((item, index) => {
      const a = byId[item.id];
      if (index)
        all.push({
          ...a.keyframes[0],
          id: `bridge-${item.key}`,
          phase: 'transition',
          duration: transitionSeconds,
          instruction: `Editorial transition to ${a.iast}. This sequence is not historically attested.`,
        });
      all.push(
        ...a.keyframes.map((f) => ({
          ...f,
          id: `${item.key}-${f.id}`,
          instruction: `${a.iast}: ${f.instruction}`,
        })),
      );
    });
    return all;
  }, [items, transitionSeconds]);
  useFlow(frames);
  return (
    <section className="sequence-preview">
      <div className="panel-title">
        Continuous preview <span>{Math.round(duration(frames))} seconds</span>
      </div>
      <FlowScene frames={frames} label="Continuous reference sequence" />
      <FlowPlayer frames={frames} />
    </section>
  );
}
