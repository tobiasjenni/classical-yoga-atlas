import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  Download,
  GripVertical,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  Upload,
} from 'lucide-react';
import { matchesSearch } from '../core/search';
import { bookFamilies, bookModels } from '../data/book';
import { exportJSON } from '../core/export';
import {
  bookSequenceDraftSchema,
  bookSequenceSchema,
  bookSequenceStorageKey,
  emptyBookSequence,
  maxSequenceItems,
  moveSequenceItem,
  sampleBookSequence,
  sequenceById,
  sequenceDuration,
  sequencePostures,
  sequenceStart,
  type SequenceItem,
} from '../core/book-sequence';
const Stage = lazy(() => import('../components/Stage'));
type Item = SequenceItem & { key: string };
const keyed = (items: SequenceItem[]): Item[] =>
  items.map((i) => ({ ...i, key: crypto.randomUUID() }));
function initial() {
  try {
    const raw = localStorage.getItem(bookSequenceStorageKey);
    if (raw) return { saved: bookSequenceDraftSchema.parse(JSON.parse(raw)), message: '' };
    if (localStorage.getItem('atlas-sequence-v1'))
      return {
        saved: emptyBookSequence(),
        message:
          'Your old HYP draft is kept separately. Start a new sequence using the book poses.',
      };
  } catch {
    return {
      saved: emptyBookSequence(),
      message:
        'The saved book draft could not be loaded. Start a new sequence or import an export.',
    };
  }
  return { saved: emptyBookSequence(), message: '' };
}
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
export default function BookSequence() {
  const [loaded] = useState(initial),
    [items, setItems] = useState(() => keyed(loaded.saved.items));
  const [name, setName] = useState(loaded.saved.name),
    [hold, setHold] = useState(10);
  const [query, setQuery] = useState(''),
    [family, setFamily] = useState(''),
    [message, setMessage] = useState(loaded.message);
  const [undoClear, setUndoClear] = useState<Item[] | null>(null);
  const [params, setParams] = useSearchParams();
  const consumed = useRef<string | null>(null),
    file = useRef<HTMLInputElement>(null);
  const value = useMemo(
    () => ({
      ...emptyBookSequence(),
      name,
      items: items.map(({ id, holdSeconds }) => ({ id, holdSeconds })),
    }),
    [name, items],
  );
  useEffect(() => {
    try {
      localStorage.setItem(bookSequenceStorageKey, JSON.stringify(value));
    } catch {
      setMessage('Unable to save locally. Export to keep your sequence.');
    }
  }, [value]);
  useEffect(() => {
    const id = params.get('add');
    if (!id) {
      consumed.current = null;
      return;
    }
    if (consumed.current === id) return;
    consumed.current = id;
    if (Object.hasOwn(sequenceById, id) && items.length < maxSequenceItems) {
      setItems((previous) => [...previous, ...keyed([{ id, holdSeconds: hold }])]);
      setMessage(`Added ${sequenceById[id].iast}.`);
    } else
      setMessage(
        'Could not add that posture. Choose a book asana and keep the sequence under 216 entries.',
      );
    const next = new URLSearchParams(params);
    next.delete('add');
    setParams(next, { replace: true });
  }, [params, setParams, hold, items.length]);
  const filtered = sequencePostures.filter(
    (e) =>
      (!family || e.family === family) &&
      matchesSearch(`${e.iast} ${e.english} ${e.sanskrit} ${e.russian} ${e.order}`, query),
  );
  function add(id: string, at = items.length) {
    if (!Object.hasOwn(sequenceById, id)) return;
    if (items.length >= maxSequenceItems) {
      setMessage('A sequence can contain up to 216 entries, including repeated poses.');
      return;
    }
    const next = [...items];
    next.splice(at, 0, ...keyed([{ id, holdSeconds: hold }]));
    setItems(next);
    setMessage(`Added ${sequenceById[id].iast}.`);
  }
  function drop(e: React.DragEvent, at: number) {
    e.preventDefault();
    e.stopPropagation();
    const key = e.dataTransfer.getData('application/x-book-sequence');
    if (key)
      setItems(
        moveSequenceItem(
          items,
          items.findIndex((i) => i.key === key),
          Math.min(at, items.length - 1),
        ),
      );
    else add(e.dataTransfer.getData('application/x-book-asana'), at);
  }
  async function importSequence(selected?: File) {
    if (!selected) return;
    try {
      if (selected.size > 1_000_000) throw Error('File exceeds 1 MB.');
      const raw = JSON.parse(await selected.text());
      if (raw.kind === 'reference-sequence')
        throw Error(
          'This is a retired HYP sequence. Create a book sequence instead; matching names can represent different poses.',
        );
      const result = bookSequenceSchema.safeParse(raw);
      if (!result.success)
        throw Error(
          'Use a book sequence export with known posture IDs, 1–216 entries, and hold times from 1 to 600 seconds.',
        );
      setName(result.data.name);
      setItems(keyed(result.data.items));
      setMessage('Book sequence imported and saved on this device.');
    } catch (e) {
      setMessage(`Import failed: ${e instanceof Error ? e.message : 'Invalid file'}`);
    }
    if (file.current) file.current.value = '';
  }
  return (
    <main className="page sequence-page book-sequence-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">DHIRENDRA BRAHMACHARI · 108 ASANAS</span>
          <h1>
            A sequence of study<span className="period">.</span>
          </h1>
          <p>
            Arrange the book’s poses, set hold times, and compare each 3D study with its original
            picture.
          </p>
        </div>
        <div className="button-row">
          {undoClear && (
            <button
              className="button"
              onClick={() => {
                setItems(undoClear);
                setUndoClear(null);
                setMessage('Sequence restored.');
              }}
            >
              Undo clear
            </button>
          )}
          <button
            className="button"
            disabled={!items.length}
            onClick={() => {
              setUndoClear(items);
              setItems([]);
              setMessage('Sequence cleared. Use Undo clear to restore it.');
            }}
          >
            Clear sequence
          </button>
          <button className="button" onClick={() => file.current?.click()}>
            <Upload size={15} /> Import
          </button>
          <input
            ref={file}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            aria-label="Import book sequence JSON"
            onChange={(e) => importSequence(e.target.files?.[0])}
          />
          <button
            className="button primary"
            disabled={!items.length || !name.trim()}
            onClick={() => {
              exportJSON(bookSequenceSchema.parse(value), 'brahmachari-sequence.json');
              setMessage('Book sequence exported.');
            }}
          >
            <Download size={15} /> Export sequence
          </button>
        </div>
      </div>
      <p className="status-message" role="status">
        {message || 'Your book sequence saves automatically on this device.'}
      </p>
      <div className="sequence-layout">
        <aside className="panel sequence-library">
          <div className="panel-title">
            The 108 book asanas <span>{filtered.length} found</span>
          </div>
          <div className="search-field">
            <Search size={15} />
            <input
              aria-label="Search sequence library"
              placeholder="Sanskrit, English or number…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <label className="sequence-family">
            Posture family
            <select
              aria-label="Sequence posture family"
              value={family}
              onChange={(e) => setFamily(e.target.value)}
            >
              <option value="">All families</option>
              {bookFamilies
                .filter((f) => f !== 'sequence')
                .map((f) => (
                  <option value={f} key={f}>
                    {f}
                  </option>
                ))}
            </select>
          </label>
          <div className="library-list">
            {filtered.map((a) => (
              <div
                className="library-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-book-asana', a.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                key={a.id}
              >
                <img src={a.hero} alt="" loading="lazy" width="48" height="56" />
                <div>
                  <strong>{a.iast}</strong>
                  <small>
                    {String(a.order).padStart(3, '0')} · {a.english}
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
            {!filtered.length && (
              <p className="empty-state">No matching postures. Try another name or family.</p>
            )}
          </div>
          <button
            className="button sequence-add-all"
            disabled={items.length + 108 > maxSequenceItems}
            onClick={() => {
              setItems([
                ...items,
                ...keyed(sequencePostures.map((a) => ({ id: a.id, holdSeconds: hold }))),
              ]);
              setMessage('Added all 108 asanas in book order.');
            }}
          >
            <Plus size={15} /> Add all 108 in book order
          </button>
        </aside>
        <section className="sequence-workspace">
          <div className="sequence-settings">
            <label>
              Sequence name
              <input
                maxLength={120}
                aria-label="Sequence name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              New pose hold (s)
              <input
                type="number"
                aria-label="Default hold seconds"
                min="1"
                max="600"
                value={hold}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 1 && n <= 600) setHold(n);
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
              Your sequence{' '}
              <span>
                {items.length} poses · {clock(sequenceDuration(items))}
              </span>
            </div>
            {!items.length && (
              <div className="empty-state">
                <Plus size={30} />
                <h2>Begin with a book posture</h2>
                <p>
                  Add from the collection, or start with all 108 in book order. Use the arrows to
                  reorder on any device.
                </p>
              </div>
            )}
            <div className="book-sequence-items">
              {items.map((item, i) => (
                <div
                  key={item.key}
                  className="sequence-item"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/x-book-sequence', item.key);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => drop(e, i)}
                >
                  <GripVertical size={15} />
                  <span className="sequence-number">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{sequenceById[item.id].iast}</strong>
                    <small>{sequenceById[item.id].english}</small>
                  </div>
                  <label className="sequence-hold">
                    <span>Hold (s)</span>
                    <input
                      type="number"
                      min="1"
                      max="600"
                      aria-label={`Hold seconds for step ${i + 1}`}
                      value={item.holdSeconds}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (n >= 1 && n <= 600)
                          setItems(items.map((v, j) => (j === i ? { ...v, holdSeconds: n } : v)));
                      }}
                    />
                  </label>
                  <button
                    className="icon-button"
                    aria-label={`Move step ${i + 1} earlier`}
                    disabled={!i}
                    onClick={() => setItems(moveSequenceItem(items, i, i - 1))}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Move step ${i + 1} later`}
                    disabled={i === items.length - 1}
                    onClick={() => setItems(moveSequenceItem(items, i, i + 1))}
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Remove step ${i + 1}: ${sequenceById[item.id].iast}`}
                    onClick={() => setItems(items.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          {!!items.length && (
            <SequencePreview key={JSON.stringify(value.items)} items={value.items} />
          )}
        </section>
      </div>
      <div className="interpretation-note">
        <span className="unverified-tag">BOOK POSES · EDITORIAL ORDER AND TIMING</span>
        <p>
          The preview holds each static pose, then switches to the next. Entry and exit movements
          are not reconstructed. Your chosen order and timing are a study aid; they are not
          prescribed by the book.
        </p>
      </div>
    </main>
  );
}
function SequencePreview({ items }: { items: SequenceItem[] }) {
  const [time, setTime] = useState(0),
    [playing, setPlaying] = useState(false),
    [loop, setLoop] = useState(false);
  const total = sequenceDuration(items),
    current = sampleBookSequence(items, time)!;
  const framing = useMemo(() => [current.pose], [current.pose]),
    model = bookModels[current.entry.id];
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(),
        delta = (now - previous) / 1000;
      previous = now;
      setTime((t) => (loop ? (t + delta) % total : Math.min(total, t + delta)));
    }, 100);
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener('visibilitychange', pause);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', pause);
    };
  }, [playing, loop, total]);
  useEffect(() => {
    if (time >= total && !loop) setPlaying(false);
  }, [time, total, loop]);
  function seek(value: number) {
    setPlaying(false);
    setTime(value);
  }
  return (
    <section className="sequence-preview" aria-label="Book sequence preview">
      <div className="panel-title">
        3D sequence preview{' '}
        <span>
          Step {current.index + 1} of {items.length}
        </span>
      </div>
      <div className="book-sequence-current">
        <h2>{current.entry.iast}</h2>
        <p>
          {current.entry.english} ·{' '}
          {Math.max(0, Math.ceil(items[current.index].holdSeconds - current.elapsed))} seconds
          remaining
        </p>
      </div>
      <div className="book-sequence-views">
        <Suspense fallback={<p>Loading 3D book study…</p>}>
          <Stage
            pose={current.pose}
            framingPoses={framing}
            label={`${current.entry.iast} book sequence study`}
          />
        </Suspense>
        <figure>
          <a href={current.entry.hero} target="_blank" rel="noreferrer">
            <img src={current.entry.hero} alt={`${current.entry.iast}, original book picture`} />
          </a>
          <figcaption>
            Book asana {current.entry.order} · {model.image}
            <br />
            <Link to={`/brahmachari/${current.entry.id}`}>Open pose & source</Link>
          </figcaption>
        </figure>
      </div>
      <div className="book-sequence-controls">
        <button
          className="icon-button"
          aria-label="Previous sequence pose"
          disabled={!current.index}
          onClick={() => seek(sequenceStart(items, current.index - 1))}
        >
          <SkipBack size={18} />
        </button>
        <button
          className="button primary"
          onClick={() => {
            if (time >= total) setTime(0);
            setPlaying(!playing);
          }}
        >
          {playing ? <Pause size={17} /> : <Play size={17} />}
          {playing ? 'Pause' : time >= total ? 'Replay' : 'Play sequence'}
        </button>
        <button
          className="icon-button"
          aria-label="Next sequence pose"
          disabled={current.index === items.length - 1}
          onClick={() => seek(sequenceStart(items, current.index + 1))}
        >
          <SkipForward size={18} />
        </button>
        <button className="icon-button" aria-label="Restart sequence" onClick={() => seek(0)}>
          <RotateCcw size={16} />
        </button>
        <label>
          <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop
        </label>
        <span>
          {clock(time)} / {clock(total)}
        </span>
      </div>
      <label className="sequence-step-picker">
        Jump to a pose
        <select
          aria-label="Jump to sequence step"
          value={current.index}
          onChange={(e) => seek(sequenceStart(items, Number(e.target.value)))}
        >
          {items.map((item, i) => (
            <option key={i} value={i}>
              {i + 1}. {sequenceById[item.id].iast} · {sequenceById[item.id].english}
            </option>
          ))}
        </select>
      </label>
      <input
        className="book-sequence-progress"
        type="range"
        min="0"
        max={total}
        step="0.1"
        value={time}
        aria-label="Sequence position in seconds"
        onChange={(e) => seek(Number(e.target.value))}
      />
      <p className="micro">
        Static book poses with a direct change between steps.{' '}
        {model.review === 'needs-refinement'
          ? model.audit.limitation
          : 'Exact contacts and joint angles remain schematic.'}
      </p>
    </section>
  );
}
