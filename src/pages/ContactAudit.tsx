import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { book } from '../data/book';
import { contactAudit, contactIssues, contactText } from '../data/contact';
import { LanguageSelector, useLanguage } from '../core/language';
import { matchesSearch } from '../core/search';
import ContactFindings from '../components/ContactFindings';
export default function ContactAudit() {
  const { language } = useLanguage(),
    t = contactText[language];
  const [params, setParams] = useSearchParams();
  const [style, setStyle] = useState<'human' | 'reference'>('human');
  const q = params.get('q') ?? '',
    focus = params.get('focus') ?? '';
  const results = contactAudit.records.filter(
    (r) =>
      matchesSearch(
        `${r.id} ${r.order} ${book.entries[r.order - 1].iast} ${book.entries[r.order - 1].sanskrit} ${Object.values(r.names).join(' ')}`,
        q,
      ) &&
      (focus === 'hands' || focus === 'feet'
        ? r[focus].some((c) => contactIssues[c].status === 'correction-needed')
        : focus === 'grip'
          ? /grip|interlocked|fist|dance|thumb|joined|fingertip/.test(r.fingers)
          : focus === 'unclear'
            ? r.hands.includes('source_unclear') ||
              r.feet.includes('source_unclear') ||
              /unclear|obscured/.test(r.fingers)
            : true),
  );
  const pages = Math.max(1, Math.ceil(results.length / 12));
  const requested = Number(params.get('page') ?? 1);
  const page = Number.isFinite(requested) ? Math.max(1, Math.min(pages, Math.floor(requested))) : 1;
  function change(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: key !== 'page' });
  }
  useEffect(() => {
    document.title = `${t.title} · Classical Yoga Atlas`;
  }, [t.title]);
  return (
    <main className="page contact-audit-page" lang={language}>
      <div className="contact-topline">
        <Link to="/">← 108 asanas</Link>
        <LanguageSelector />
      </div>
      <span className="eyebrow">DHIRENDRA BRAHMACHARI · 2026-09-09</span>
      <h1>{t.title}</h1>
      <p className="contact-subtitle">{t.subtitle}</p>
      <p>{t.intro}</p>
      <div className="contact-method">
        <strong>{t.corrections}</strong>
        <p>{t.limitation}</p>
        <a href="/audits/contacts/audit.json" download>
          {t.download} ↓
        </a>
      </div>
      <div className="contact-audit-tools">
        <label>
          {t.search}
          <input type="search" value={q} onChange={(e) => change('q', e.target.value)} />
        </label>
        <label>
          {t.filter}
          <select value={focus} onChange={(e) => change('focus', e.target.value)}>
            <option value="">{t.all}</option>
            <option value="hands">{t.hands}</option>
            <option value="feet">{t.feet}</option>
            <option value="grip">{t.grip}</option>
            <option value="unclear">{t.unclear}</option>
          </select>
        </label>
        <label>
          {t.models}
          <select value={style} onChange={(e) => setStyle(e.target.value as 'human' | 'reference')}>
            <option value="human">{t.human}</option>
            <option value="reference">{t.reference}</option>
          </select>
        </label>
      </div>
      <p role="status">
        {results.length} {t.results} · {page} / {pages}
      </p>
      <div className="contact-audit-list">
        {results.slice((page - 1) * 12, page * 12).map((r) => {
          const entry = book.entries[r.order - 1];
          return (
            <article key={r.id} className="contact-audit-card">
              <header>
                <span className="eyebrow">
                  {String(r.order).padStart(3, '0')} · {r.sourceImage}
                </span>
                <h2>
                  <Link to={`/brahmachari/${r.id}`}>{entry.iast}</Link>
                </h2>
                <p>{r.names[language]}</p>
                <span className="contact-status">{t.corrections}</span>
              </header>
              <div className="contact-evidence-grid">
                <figure>
                  <a href={entry.hero} target="_blank" rel="noreferrer">
                    <img src={entry.hero} alt={`${entry.iast} — ${t.source}`} loading="lazy" />
                  </a>
                  <figcaption>
                    {t.source} · {r.sourceImage}
                  </figcaption>
                </figure>
                <div>
                  <h3>{t.reading}</h3>
                  <p>{r.description[language]}</p>
                  <p className="micro">{t.editorial}</p>
                  <ContactFindings id={r.id} expanded />
                </div>
              </div>
              <details className="contact-evidence">
                <summary>
                  {t.models} · {t[style]} · {t.front} / {t.side} / {t.rear}
                </summary>
                <p className="micro">{t.evidenceNote}</p>
                <div className="contact-render-grid">
                  {r.meshes[style].views.map((url, i) => (
                    <figure key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt={`${entry.iast} — ${t[style]} — ${[t.front, t.side, t.rear][i]}`}
                          loading="lazy"
                        />
                      </a>
                      <figcaption>{[t.front, t.side, t.rear][i]}</figcaption>
                    </figure>
                  ))}
                </div>
              </details>
              <details className="contact-evidence">
                <summary>
                  {t.source} · {r.reviewedImages.length} · {t.reviewed}
                </summary>
                <div className="contact-source-strip">
                  {entry.images.map((im) => (
                    <a key={im.id} href={`/brahmachari/${r.id}?image=${im.id}`}>
                      <img src={im.src} alt={`${entry.iast} ${im.id}`} loading="lazy" />
                      <span>{im.id}</span>
                    </a>
                  ))}
                </div>
                <p className="micro">
                  {t.paragraphs}: {r.sourceParagraphs.join(', ')}.
                </p>
                <Link to={`/brahmachari/${r.id}?text=1#original-section`}>{t.sourceText} →</Link>
              </details>
            </article>
          );
        })}
      </div>
      {!results.length && <p>{t.noResults}</p>}
      <nav className="contact-pages" aria-label={t.report}>
        <button
          className="button"
          disabled={page <= 1}
          onClick={() => {
            change('page', String(page - 1));
            window.scrollTo(0, 0);
          }}
        >
          {t.previous}
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          className="button"
          disabled={page >= pages}
          onClick={() => {
            change('page', String(page + 1));
            window.scrollTo(0, 0);
          }}
        >
          {t.next}
        </button>
      </nav>
    </main>
  );
}
