import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowLeft, BookOpen, Search, X } from 'lucide-react';
import { book, bookModels, bookFamilies, bookResults, pageSize } from '../data/book';
import CollectionLinks from '../components/CollectionLinks';
import ModelFilter from '../components/ModelFilter';
const PoseThumbnail = lazy(() =>
  import('../components/Thumbnails').then((m) => ({ default: m.PoseThumbnail })),
);
const ThumbnailCanvas = lazy(() =>
  import('../components/Thumbnails').then((m) => ({ default: m.ThumbnailCanvas })),
);

export default function BookIndex() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const catalogue = useRef<HTMLElement>(null);
  const { entries, visible, pages, page } = bookResults(params);
  const mode = params.get('view') === 'models' ? 'models' : 'photos';
  const active = !!(params.get('q') || params.get('family') || params.get('review'));
  useEffect(() => {
    document.title = '108 asanas · Classical Yoga Atlas';
    if (location.state?.catalogue) requestAnimationFrame(() => catalogue.current?.scrollIntoView());
  }, []);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'view') next.delete('page');
    setParams(next, { replace: true });
  }
  function goPage(nextPage: number) {
    const next = new URLSearchParams(params);
    next.set('page', String(nextPage));
    setParams(next);
    catalogue.current?.scrollIntoView({ behavior: 'instant' });
    requestAnimationFrame(() =>
      document.getElementById('book-results')?.focus({ preventScroll: true }),
    );
  }
  function reset() {
    const next = new URLSearchParams();
    if (mode === 'models') next.set('view', 'models');
    setParams(next, { replace: true });
  }
  return (
    <main className="page book-page">
      <CollectionLinks />
      <section className="book-hero">
        <div>
          <span className="eyebrow">THE BRAHMACHARI COLLECTION</span>
          <h1>
            Yogāsana Vijñāna<span className="period">.</span>
          </h1>
          <p className="book-author">108 asanas. One illustrated source.</p>
          <p>
            Explore Dhirendra Brahmachari’s postures through the original book pictures and
            interactive 3D studies.
          </p>
          <div className="book-hero-actions">
            <a className="button primary" href="#catalogue">
              Find an asana <ArrowRight size={16} />
            </a>
            <Link to="/sources#brahmachari" className="text-button">
              <BookOpen size={16} /> About the book
            </Link>
          </div>
          <div className="book-statline">
            <span>108 Sanskrit & English names</span>
            <span>185 source pictures</span>
          </div>
        </div>
        <Link to="/brahmachari/padmasana" className="book-cover">
          <img
            src="/book/brahmachari/Im11.jpg"
            alt="Brahmachari seated in Padmasana, from the supplied book"
            width="300"
            height="300"
          />
          <span>
            Padmāsana · Lotus <ArrowRight size={17} />
          </span>
        </Link>
      </section>
      <section
        id="catalogue"
        ref={catalogue}
        className="book-catalogue"
        aria-labelledby="catalogue-title"
      >
        <div className="book-catalogue-heading">
          <div>
            <span className="eyebrow">EXPLORE THE FORMS</span>
            <h2 id="catalogue-title">The asana library</h2>
          </div>
          <Link className="text-button" to="/brahmachari/surya-namaskar">
            Sūrya Namaskāra · 12 stages <ArrowRight size={16} />
          </Link>
        </div>
        <p className="book-scope">
          The 3D studies show static poses. Exact grips and movements remain unverified; compare
          each study with its source picture.
        </p>
        <div className="library-controls">
          <label className="book-search">
            <Search size={19} />
            <input
              aria-label="Search Brahmachari postures"
              value={params.get('q') ?? ''}
              onChange={(e) => filter('q', e.target.value)}
              placeholder="Find a posture in Sanskrit, English or Russian…"
              autoComplete="off"
            />
            {params.get('q') && (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => filter('q', '')}
              >
                <X size={17} />
              </button>
            )}
          </label>
          <div className="book-filters">
            <label>
              Family
              <select
                aria-label="Book posture family"
                value={
                  bookFamilies.includes(params.get('family') ?? '') ? params.get('family')! : ''
                }
                onChange={(e) => filter('family', e.target.value)}
              >
                <option value="">All families</option>
                {bookFamilies.map((family) => (
                  <option key={family} value={family}>
                    {family === 'sequence'
                      ? 'Sun salutation'
                      : family[0].toUpperCase() + family.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Show
              <select
                aria-label="Book review filter"
                value={params.get('review') ?? ''}
                onChange={(e) => filter('review', e.target.value)}
              >
                <option value="">All studies</option>
                <option value="refine">Models need refinement</option>
              </select>
            </label>
            <label>
              Order
              <select
                aria-label="Book sort order"
                value={params.get('sort') ?? ''}
                onChange={(e) => filter('sort', e.target.value)}
              >
                <option value="">Book order</option>
                <option value="name">Sanskrit A–Z</option>
              </select>
            </label>
            {active && (
              <button className="text-button" onClick={reset}>
                <X size={15} /> Clear filters
              </button>
            )}
          </div>
          <div className="book-view-switch">
            <div className="view-segment" role="group" aria-label="Library preview">
              <button aria-pressed={mode === 'models'} onClick={() => filter('view', 'models')}>
                3D studies
              </button>
              <button aria-pressed={mode === 'photos'} onClick={() => filter('view', '')}>
                Book pictures
              </button>
            </div>
            {mode === 'models' && <ModelFilter />}
          </div>
        </div>
        <div className="library-results" id="book-results" tabIndex={-1}>
          <p role="status">
            {entries.length
              ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, entries.length)} of ${entries.length} sections`
              : 'No matching sections'}{' '}
            <span>
              · {active ? 'filtered collection' : '108 asanas · sun salutation listed separately'}
            </span>
          </p>
          <span>
            Page {page} of {pages}
          </span>
        </div>
        <div className="book-grid">
          {visible.map((entry) => (
            <Link
              className="book-card"
              to={`/brahmachari/${entry.id}`}
              state={{ collectionSearch: params.toString() }}
              key={entry.id}
            >
              <div className="book-card-image">
                <span className="book-order">{String(entry.order).padStart(3, '0')}</span>
                <Suspense
                  fallback={
                    <img
                      src={entry.hero}
                      alt={`${entry.english}, book illustration`}
                      width="300"
                      height="270"
                    />
                  }
                >
                  {mode === 'models' && bookModels[entry.id] ? (
                    <PoseThumbnail
                      id={`book-${entry.id}`}
                      name={entry.iast}
                      pose={bookModels[entry.id].pose}
                    />
                  ) : (
                    <img
                      src={entry.hero}
                      alt={`${entry.english}, book illustration`}
                      loading="lazy"
                      width="300"
                      height="270"
                    />
                  )}
                </Suspense>
                {mode === 'models' && (
                  <img
                    className="book-source-inset"
                    src={entry.hero}
                    alt={`${entry.english}, source picture`}
                    loading="lazy"
                    width="64"
                    height="72"
                  />
                )}
                <span className="book-image-count">
                  {entry.images.length} {entry.images.length === 1 ? 'picture' : 'pictures'}
                </span>
              </div>
              <div className="book-card-copy">
                <span className="eyebrow">{entry.family}</span>
                <h3>{entry.iast}</h3>
                <p className="book-sanskrit" lang="sa">
                  {entry.sanskrit}
                </p>
                <p className="book-english">{entry.english}</p>
                <span className="book-card-note">
                  {entry.kind === 'sequence' ? 'Explore the 12 stages' : 'View pose & source'}
                  <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
        {mode === 'models' && visible.length > 0 && (
          <Suspense fallback={null}>
            <ThumbnailCanvas />
          </Suspense>
        )}
        {!entries.length && (
          <div className="empty-state">
            <Search size={28} />
            <h3>No postures found</h3>
            <p>Try a shorter name, an English name such as “lotus”, or clear the filters.</p>
            <button className="button primary" onClick={reset}>
              Clear filters
            </button>
          </div>
        )}
        {pages > 1 && (
          <nav className="library-pagination" aria-label="Library pages">
            <button className="button" disabled={page === 1} onClick={() => goPage(page - 1)}>
              <ArrowLeft size={16} /> Previous
            </button>
            <div>
              {Array.from({ length: pages }, (_, i) => (
                <button
                  className="page-number"
                  key={i}
                  aria-label={`Page ${i + 1}`}
                  aria-current={page === i + 1 ? 'page' : undefined}
                  onClick={() => goPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button className="button" disabled={page === pages} onClick={() => goPage(page + 1)}>
              Next <ArrowRight size={16} />
            </button>
          </nav>
        )}
      </section>
    </main>
  );
}
