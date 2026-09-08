import { lazy, Suspense, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Check,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { asanas, byId, normalizeSearch } from '../data';
import type { Asana } from '../core/schema';
import ModelFilter from '../components/ModelFilter';
import CollectionLinks from '../components/CollectionLinks';
const Thumbnail = lazy(() =>
  import('../components/Thumbnails').then((m) => ({ default: m.Thumbnail })),
);
const ThumbnailCanvas = lazy(() =>
  import('../components/Thumbnails').then((m) => ({ default: m.ThumbnailCanvas })),
);
export function Difficulty({ value }: { value: number }) {
  return (
    <span className="difficulty" aria-label={`Editorial difficulty ${value} of 5, unverified`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <i className={n <= value ? 'filled' : ''} key={n} />
      ))}
      <span>{value} / 5</span>
    </span>
  );
}
export default function Atlas() {
  const [params, setParams] = useSearchParams(),
    [filters, setFilters] = useState(false);
  const query = params.get('q') ?? '',
    family = params.get('family') ?? '',
    difficulty = params.get('difficulty') ?? '',
    source = params.get('source') ?? '',
    sort = params.get('sort') ?? 'name';
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }
  const found = asanas
    .filter(
      (a) =>
        normalizeSearch(
          [a.sanskrit, a.iast, a.translit, a.english, ...a.aliases].join(' '),
        ).includes(normalizeSearch(query)) &&
        (!family || a.family === family) &&
        (!difficulty || a.difficulty === Number(difficulty)) &&
        (!source || a.source.some((s) => s.text === source)),
    )
    .sort((a, b) =>
      sort === 'difficulty'
        ? a.difficulty - b.difficulty
        : sort === 'source'
          ? Number.parseInt(a.source[0].verse) - Number.parseInt(b.source[0].verse)
          : a.iast.localeCompare(b.iast),
    );
  const active = !!(query || family || difficulty || source);
  return (
    <main className="page atlas-page">
      <CollectionLinks />
      <div className="page-topline">
        <span className="eyebrow">A SOURCE-LED STUDY OF ASANA</span>
        <span className="edition">
          VOLUME 01 <span> / </span> CLASSICAL FOUNDATIONS
        </span>
      </div>
      <section className="atlas-hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="live-dot" /> THE CLASSICAL YOGA ATLAS
          </span>
          <h1>
            Ancient texts.
            <br />A new perspective.
          </h1>
          <p>
            Explore the postures of classical yoga in three dimensions. Follow the movement. Return
            to the source.
          </p>
          <a className="hero-link" href="#collection">
            Explore the collection <ArrowDown size={16} />
          </a>
          <div className="hero-stats">
            <div>
              <strong>15</strong>
              <span>attested asanas</span>
            </div>
            <div>
              <strong>01</strong>
              <span>primary source</span>
            </div>
            <div>
              <strong>3D</strong>
              <span>every perspective</span>
            </div>
          </div>
        </div>
        <div className="hero-art">
          <span className="sanskrit-watermark" aria-hidden="true">
            पद्म
          </span>
          <Suspense fallback={<div className="thumbnail loading">Loading reference…</div>}>
            <Thumbnail asana={byId.padmasana} hero />
          </Suspense>
          <Link to="/asana/padmasana" className="hero-caption">
            <span>
              <strong>Padmāsana</strong>
              <small>THE LOTUS POSTURE · HYP 1.46–51</small>
            </span>
            <ArrowUpRight size={22} />
          </Link>
          <span className="hero-art-label">SCHEMATIC RECONSTRUCTION</span>
        </div>
      </section>
      <div className="collection-heading" id="collection">
        <div>
          <span className="eyebrow">THE COLLECTION</span>
          <h2>
            Fifteen ways to be still<span className="period">.</span>
          </h2>
        </div>
        <span className="source-chip">
          <BookOpen size={14} /> Haṭha Yoga Pradīpikā <span>· Chapter I</span>
        </span>
      </div>
      <div className="filter-bar">
        <ModelFilter />
        <div className="search-field">
          <Search size={18} />
          <input
            aria-label="Search asanas"
            placeholder="Search Sanskrit, IAST or English…"
            value={query}
            onChange={(e) => filter('q', e.target.value)}
          />
          {query && (
            <button aria-label="Clear search" onClick={() => filter('q', '')}>
              <X size={15} />
            </button>
          )}
        </div>
        <label className="filter-select">
          <span className="sr-only">Family</span>
          <select
            aria-label="Filter by family"
            value={family}
            onChange={(e) => filter('family', e.target.value)}
          >
            <option value="">All families</option>
            {[
              'meditative',
              'seated',
              'standing',
              'supine',
              'prone',
              'inverted',
              'balance',
              'bandha-mudra',
            ].map((f) => (
              <option value={f} key={f}>
                {f[0].toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-select">
          <span className="sr-only">Difficulty</span>
          <select
            aria-label="Filter by difficulty"
            value={difficulty}
            onChange={(e) => filter('difficulty', e.target.value)}
          >
            <option value="">All difficulties</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                Level {n} · editorial
              </option>
            ))}
          </select>
        </label>
        <button
          className="filter-toggle"
          aria-label="Additional filters"
          aria-expanded={filters}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal size={17} />
          <span>Filters</span>
        </button>
      </div>
      {filters && (
        <div className="expanded-filters">
          <label>
            Source text
            <select
              aria-label="Filter by source"
              value={source}
              onChange={(e) => filter('source', e.target.value)}
            >
              <option value="">All published sources</option>
              <option>Hatha Yoga Pradipika</option>
              <option disabled>Gheranda Samhita · research pending</option>
              <option disabled>Shiva Samhita · research pending</option>
              <option disabled>Sritattvanidhi · research pending</option>
              <option disabled>Transitional sources · research pending</option>
            </select>
          </label>
          <p>
            Only the confirmed 15-asana seed set is published. Difficulty is an unverified editorial
            estimate.
          </p>
        </div>
      )}
      <div className="results-row">
        <span>
          Showing <strong>{found.length}</strong> of 15 asanas{' '}
          {active && (
            <button onClick={() => setParams({})}>
              Clear filters <X size={12} />
            </button>
          )}
        </span>
        <label>
          Sort by{' '}
          <select
            aria-label="Sort asanas"
            value={sort}
            onChange={(e) => filter('sort', e.target.value)}
          >
            <option value="name">Sanskrit name</option>
            <option value="source">Source order</option>
            <option value="difficulty">Difficulty</option>
          </select>
        </label>
      </div>
      <div className="asana-grid">
        {found.map((asana, i) => (
          <AsanaCard asana={asana} key={asana.id} index={i} />
        ))}
      </div>
      {!found.length && (
        <div className="empty-state">
          <Search size={28} />
          <h2>No postures found</h2>
          <p>Try another name or broaden the filters.</p>
          <button className="button" onClick={() => setParams({})}>
            Reset filters
          </button>
        </div>
      )}
      <div className="source-note">
        <BookOpen size={20} />
        <div>
          <strong>Every posture begins with a source.</strong>
          <p>
            Verse-level references accompany every entry. Reconstructed movement and uncertain
            details are always labelled.
          </p>
        </div>
        <Link to="/sources">
          Our approach <ArrowUpRight size={16} />
        </Link>
      </div>
      <Suspense fallback={null}>
        <ThumbnailCanvas />
      </Suspense>
    </main>
  );
}
function AsanaCard({ asana, index }: { asana: Asana; index: number }) {
  return (
    <Link className={`asana-card tone-${index % 4}`} to={`/asana/${asana.id}`}>
      <div className="card-art">
        <span className="family-tag">{asana.family}</span>
        <span className="card-index">
          {String(Number.parseInt(asana.source[0].verse)).padStart(2, '0')}
        </span>
        <Suspense fallback={<div className="thumbnail loading">Loading…</div>}>
          <Thumbnail asana={asana} />
        </Suspense>
        <span className="card-3d">3D · UNVERIFIED</span>
      </div>
      <div className="card-content">
        <span className="devanagari">{asana.sanskrit}</span>
        <div className="card-title">
          <h3>{asana.iast}</h3>
          <ArrowUpRight size={17} />
        </div>
        <p>{asana.english}</p>
        <div className="card-meta">
          <span>
            <Check size={12} /> HYP 1.{asana.source[0].verse}
          </span>
          <Difficulty value={asana.difficulty} />
        </div>
      </div>
    </Link>
  );
}
