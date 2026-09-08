import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  GitCompareArrows,
  Pencil,
  Wind,
  Eye,
} from 'lucide-react';
import { byId } from '../data';
import FlowPlayer, { FlowScene, useFlow } from '../components/FlowPlayer';
import { Difficulty } from './Atlas';
import type { Asana } from '../core/schema';
export default function Detail() {
  const { id } = useParams();
  const asana = id ? byId[id] : undefined;
  return asana ? (
    <Entry key={asana.id} asana={asana} />
  ) : (
    <main className="page empty-state">
      <h1>Posture not found</h1>
      <Link className="button" to="/">
        Return to the atlas
      </Link>
    </main>
  );
}
function Entry({ asana: a }: { asana: Asana }) {
  useFlow(a.keyframes);
  useEffect(() => {
    document.title = `${a.iast} · HYP comparison · Classical Yoga Atlas`;
  }, [a]);
  return (
    <main className="page detail-page">
      <Link to="/hyp" className="back-link">
        <ArrowLeft size={15} /> Back to the atlas
      </Link>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            {a.family} <span> / </span> CLASSICAL CORPUS
          </span>
          <div className="title-pair">
            <h1>{a.iast}</h1>
            <span className="detail-sanskrit">{a.sanskrit}</span>
          </div>
          <p>
            {a.english} <span className="dot-separator">·</span> <Difficulty value={a.difficulty} />
          </p>
        </div>
        <Link className="button" to={`/compare?left=${a.id}`}>
          <GitCompareArrows size={16} /> Compare
        </Link>
      </div>
      <div className="detail-layout">
        <section className="viewer-panel">
          <FlowScene frames={a.keyframes} label={`${a.iast} animated reference`} />
          <FlowPlayer frames={a.keyframes} />
        </section>
        <aside className="detail-aside">
          <div className="citation-card">
            <span className="eyebrow">
              <BookOpen size={15} /> THE PRIMARY SOURCE
            </span>
            <h2>Haṭha Yoga Pradīpikā</h2>
            <div className="verse-number">1.{a.source[0].verse}</div>
            <span className="verified">
              <Check size={13} /> Name and passage attested
            </span>
            <p>{a.description}</p>
            {a.source.map((s) => (
              <div key={s.verse}>
                <p className="micro">{s.edition}</p>
                <a href={s.url} target="_blank" rel="noreferrer">
                  Read chapter {s.chapter}, verse {s.verse} <ArrowUpRight size={14} />
                </a>
              </div>
            ))}
          </div>
          <div className="reference-details">
            <Link className="text-button" to={`/brahmachari/${a.id}`}>
              <BookOpen size={18} /> Compare Brahmachari’s illustrations
            </Link>
            <div>
              <Wind size={18} />
              <div>
                <h3>
                  Breath <span className="unverified-tag">unverified cues</span>
                </h3>
                <p>{a.breath}</p>
              </div>
            </div>
            <div>
              <Eye size={18} />
              <div>
                <h3>
                  Drishti{' '}
                  {a.fieldProvenance.drishti === 'unverified' && (
                    <span className="unverified-tag">unverified</span>
                  )}
                </h3>
                <p>{a.drishti ?? 'No verified gaze instruction recorded for this entry.'}</p>
              </div>
            </div>
          </div>
          <Link className="button studio-link" to={`/studio?asana=${a.id}`}>
            <Pencil size={15} /> Open in pose studio <ArrowUpRight size={14} />
          </Link>
        </aside>
      </div>
      {a.interpretationNotes.length > 0 && (
        <section className="interpretation-note">
          <span className="unverified-tag">INTERPRETATION · UNVERIFIED</span>
          {a.interpretationNotes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </section>
      )}
      <div className="notes-grid">
        <section className="notes-block traditional">
          <span className="eyebrow">FROM THE TEXT</span>
          <h2>Traditional claims</h2>
          {a.traditionalClaims.length ? (
            a.traditionalClaims.map((c) => <p key={c}>{c}</p>)
          ) : (
            <p>No traditional claim has been transcribed for this entry. See the cited passage.</p>
          )}
          <span className="micro">
            Historical statements are not presented as medical evidence.
          </span>
        </section>
        <section className="notes-block modern">
          <span className="eyebrow">EDITORIAL CONTEXT · UNVERIFIED</span>
          <h2>Reading the reconstruction</h2>
          {a.modernNotes?.map((n) => <p key={n}>{n}</p>)}
        </section>
        <section className="notes-block">
          <span className="eyebrow">REFERENCE LIMITS</span>
          <h2>Contraindications</h2>
          {a.contraindications.length ? (
            a.contraindications.map((c) => <p key={c}>{c}</p>)
          ) : (
            <p>
              No verified contraindication information is recorded. An empty field does not
              establish that a posture is safe.
            </p>
          )}
          <span className="unverified-tag">unverified</span>
        </section>
      </div>
      <div className="related-row">
        <section>
          <span className="eyebrow">CONTINUE EXPLORING</span>
          <h2>Related postures</h2>
          <p className="micro">Editorial links · not a traditional sequence</p>
          <div className="related-links">
            {a.relatedAsanas.map((id) => (
              <Link className="button" key={id} to={`/asana/${id}`}>
                {byId[id].iast}
                <ArrowUpRight size={14} />
              </Link>
            ))}
          </div>
        </section>
        <section>
          <span className="eyebrow">COUNTERPOSES</span>
          <p>
            {a.counterpose?.length
              ? a.counterpose.map((id) => (
                  <Link key={id} to={`/asana/${id}`}>
                    {byId[id].iast}
                  </Link>
                ))
              : 'No source-verified counterpose prescription recorded.'}
          </p>
        </section>
      </div>
    </main>
  );
}
