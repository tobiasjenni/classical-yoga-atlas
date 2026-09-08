import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Link2 } from 'lucide-react';
import { asanas, byId } from '../data';
import FlowPlayer, { FlowScene, useFlow } from '../components/FlowPlayer';
import { duration } from '../core/motion';
export default function Compare() {
  const [params, setParams] = useSearchParams();
  const left = byId[params.get('left') ?? 'padmasana'] ?? byId.padmasana,
    right = byId[params.get('right') ?? 'siddhasana'] ?? byId.siddhasana;
  useFlow(left.keyframes);
  function select(side: string, id: string) {
    const p = new URLSearchParams(params);
    p.set(side, id);
    setParams(p, { replace: true });
  }
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SIDE BY SIDE</span>
          <h1>
            A closer comparison<span className="period">.</span>
          </h1>
          <p>Two postures. One shared movement timeline.</p>
        </div>
        <span className="source-chip">
          <Link2 size={15} /> Synchronized playback
        </span>
      </div>
      <div className="compare-grid">
        {[left, right].map((a, i) => (
          <section className="compare-panel" key={i}>
            <label className="compare-select">
              {i ? 'RIGHT POSTURE' : 'LEFT POSTURE'}
              <select
                aria-label={i ? 'Right asana' : 'Left asana'}
                value={a.id}
                onChange={(e) => select(i ? 'right' : 'left', e.target.value)}
              >
                {asanas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.iast} — {item.english}
                  </option>
                ))}
              </select>
            </label>
            <FlowScene
              frames={a.keyframes}
              syncDuration={duration(left.keyframes)}
              label={`${i ? 'Right' : 'Left'} comparison: ${a.iast}`}
            />
            <div className="compare-caption">
              <div>
                <strong>{a.iast}</strong>
                <p>{a.description}</p>
                <span className="micro">
                  HYP 1.{a.source[0].verse} · {a.family} · movement unverified
                </span>
              </div>
              <Link to={`/asana/${a.id}`} aria-label={`Read ${a.iast}`}>
                <ArrowUpRight size={20} />
              </Link>
            </div>
          </section>
        ))}
      </div>
      <FlowPlayer frames={left.keyframes} />
      <p className="micro">
        Both viewers share normalized elapsed time. The instruction below the viewers belongs to the
        left posture; phase durations may differ in authored data. These comparisons are editorial.
      </p>
    </main>
  );
}
