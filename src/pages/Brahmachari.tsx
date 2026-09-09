import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, X } from 'lucide-react';
import { book, bookModels as models, type BookEntry as Entry } from '../data/book';
import BookIndex from './BookIndex';
const Stage = lazy(() => import('../components/Stage'));
export default function Brahmachari() {
  const { id } = useParams();
  if (id) {
    const entry = book.entries.find((e) => e.id === id);
    return entry ? (
      <BookEntry key={id} entry={entry} />
    ) : (
      <main className="page empty-state">
        <h1>Posture not found</h1>
        <Link to="/brahmachari">Return to the book</Link>
      </main>
    );
  }
  return <BookIndex />;
}
function BookEntry({ entry: e }: { entry: Entry }) {
  const location = useLocation();
  const [imageParams, setImageParams] = useSearchParams();
  const collectionSearch =
    typeof location.state?.collectionSearch === 'string' ? location.state.collectionSearch : '';
  const [view, setView] = useState<'split' | 'picture' | 'model'>(() =>
    window.matchMedia('(max-width: 600px)').matches ? 'model' : 'split',
  );
  useEffect(() => {
    document.title = `${e.iast} · ${e.english} · Classical Yoga Atlas`;
  }, [e]);

  const [selected, updateSelected] = useState(
      Math.max(
        0,
        e.images.findIndex((i) =>
          imageParams.get('image') ? i.id === imageParams.get('image') : i.src === e.hero,
        ),
      ),
    ),
    [textOpen, setTextOpen] = useState(false),
    [text, setText] = useState<string[]>([]),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const requested = imageParams.get('image');
    updateSelected(
      Math.max(
        0,
        e.images.findIndex((i) => (requested ? i.id === requested : i.src === e.hero)),
      ),
    );
  }, [imageParams, e.images, e.hero]);
  function setSelected(value: number | ((n: number) => number)) {
    const next = typeof value === 'function' ? value(selected) : value;
    updateSelected(next);
    const params = new URLSearchParams(imageParams);
    params.set('image', e.images[next].id);
    setImageParams(params, { replace: true, state: location.state });
  }
  const dialog = useRef<HTMLDialogElement>(null),
    current = e.images[selected];
  useEffect(() => {
    if (!textOpen || text.length) return;
    setError('');
    const controller = new AbortController();
    fetch(e.textUrl, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Could not load the Russian section.');
        return r.json();
      })
      .then((r) => {
        if (!Array.isArray(r.paragraphs)) throw new Error('Invalid section text.');
        setText(r.paragraphs);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      });
    return () => controller.abort();
  }, [textOpen, e.textUrl, text.length, retry]);
  const bookModel = models[e.id];
  const previous = book.entries[e.order - 2],
    next = book.entries[e.order];
  return (
    <main className="page book-page book-detail">
      <Link
        className="back-link"
        to={`/${collectionSearch ? `?${collectionSearch}` : ''}`}
        state={{ catalogue: true }}
      >
        <ArrowLeft size={16} /> Back to Brahmachari collection
      </Link>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            DHIRENDRA BRAHMACHARI / {e.family} / {String(e.order).padStart(3, '0')}
          </span>
          <h1>{e.iast}</h1>
          <p className="book-sanskrit" lang="sa">
            {e.sanskrit}
          </p>
          <p>{e.english}</p>
          <p lang="ru" className="book-russian">
            {e.russian}
          </p>
        </div>
        <span className="unverified-tag">
          {bookModel ? '3D reconstruction · unverified' : '12 illustrated stages'}
        </span>
      </div>
      <div className="detail-viewbar">
        {bookModel && (
          <div className="view-segment" role="group" aria-label="Study view">
            <button aria-pressed={view === 'split'} onClick={() => setView('split')}>
              Side by side
            </button>
            <button aria-pressed={view === 'picture'} onClick={() => setView('picture')}>
              Book picture
            </button>
            {bookModel && (
              <button aria-pressed={view === 'model'} onClick={() => setView('model')}>
                3D model
              </button>
            )}
          </div>
        )}
        <span className="micro">
          {e.order <= 108 ? `Asana ${e.order} of 108` : 'Sun salutation'} · {e.images.length} source
          {e.images.length === 1 ? ' picture' : ' pictures'}
        </span>
      </div>
      <div className={`book-detail-grid study-view-${bookModel ? view : 'picture'}`}>
        <section className="book-gallery" aria-label="Book illustrations">
          <button
            className="book-main-image"
            aria-label="Enlarge book illustration"
            onClick={() => dialog.current?.showModal()}
          >
            <img src={current.src} alt={`${e.name}, EPUB illustration ${current.id}`} />
            <span>Enlarge picture</span>
          </button>
          <div className="book-gallery-caption">
            <button
              className="icon-button"
              aria-label="Previous illustration"
              disabled={selected === 0}
              onClick={() => setSelected((n) => n - 1)}
            >
              <ArrowLeft size={18} />
            </button>
            <span>
              Illustration {selected + 1} of {e.images.length} · EPUB {current.id}
            </span>
            <button
              className="icon-button"
              aria-label="Next illustration"
              disabled={selected === e.images.length - 1}
              onClick={() => setSelected((n) => n + 1)}
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <div className="book-thumbnails">
            {e.images.map((im, i) => (
              <button
                key={im.id}
                aria-label={`Illustration ${i + 1}: ${im.id}`}
                aria-pressed={i === selected}
                onClick={() => setSelected(i)}
              >
                <img src={im.src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </section>
        <aside>
          {bookModel && view !== 'picture' && (
            <section className="book-model-panel">
              <Suspense fallback={<p>Loading 3D study…</p>}>
                <Stage pose={bookModel.pose} label={`${e.iast} Brahmachari 3D study`} />
              </Suspense>
              <p className="micro">
                Static study of EPUB {bookModel.image}. Drag to inspect the arms and legs; use the
                Human / Reference selector above.
              </p>
              {current.id !== bookModel.image && (
                <button
                  className="text-button"
                  onClick={() => setSelected(e.images.findIndex((i) => i.id === bookModel.image))}
                >
                  Show this model’s source picture
                </button>
              )}
              {bookModel.review === 'needs-refinement' && (
                <p className="micro">{bookModel.audit.limitation}</p>
              )}
              <details className="micro">
                <summary>Model audit notes</summary>
                <p>
                  Compared with {bookModel.image} from the front, side and rear three-quarter views.
                </p>
                <p>Features checked: {bookModel.audit.featuresChecked}.</p>
                {bookModel.review !== 'needs-refinement' && <p>{bookModel.audit.limitation}</p>}
                <a href={`/audits/blender/?q=${encodeURIComponent(e.id)}`}>
                  View the Blender render audit
                </a>
              </details>
              <p className="micro">
                Contact and joint angles are schematic. This model does not reproduce every
                variation in the section.
              </p>
            </section>
          )}
          <section className="citation-card">
            <span className="eyebrow">READING THE PICTURE</span>
            <h2>{e.english}</h2>
            <p>{e.summary}</p>
            <p className="micro">
              English label and visual description are editorial. The original section and pictures
              remain the source.
            </p>
          </section>
          <section className="notes-block book-reference">
            <span className="eyebrow">SOURCE LOCATION</span>
            <h3>{book.title}</h3>
            <p>{book.author} · Russian EPUB supplied by the user.</p>
            <p lang="ru">{e.russian}</p>
            <p className="micro">
              {e.file} · {current.id}
              <br />
              Section {e.order} in this imported collection. This is not a printed page number.
            </p>
            <Link className="text-button" to="/sources#brahmachari">
              About this edition <ArrowRight size={15} />
            </Link>
          </section>
        </aside>
      </div>
      <section className="notes-block book-comparison">
        <span className="eyebrow">BOOK STUDY</span>
        <h2>{bookModel ? 'Study this posture in a sequence' : 'The illustrated sequence'}</h2>
        <p>
          {bookModel
            ? 'This static 3D study follows the selected book picture. Add it to your sequence to study the poses in your chosen order and timing. Entry and exit movements are not inferred from the photograph.'
            : 'The book supplies twelve illustrated stages of Sūrya Namaskār. These pictures remain available as a separate source section.'}
        </p>
        {bookModel && (
          <Link className="button primary" to={`/sequence?add=${encodeURIComponent(e.id)}`}>
            Add to book sequence <ArrowRight size={16} />
          </Link>
        )}
      </section>
      <section className="notes-block original-section">
        <button
          className="text-button"
          aria-expanded={textOpen}
          onClick={() => setTextOpen((v) => !v)}
        >
          <BookOpen size={18} />
          {textOpen ? 'Hide' : 'Read'} original Russian section
        </button>
        {textOpen && (
          <>
            <p className="micro">
              Original book text, including its historical claims. These claims are not verified
              medical guidance. Sanskrit spellings and English labels in the atlas are editorial
              normalizations of the supplied Russian headings.
            </p>
            {error ? (
              <div role="alert">
                <p>{error}</p>
                <button className="button" onClick={() => setRetry((n) => n + 1)}>
                  Retry loading text
                </button>
              </div>
            ) : text.length ? (
              <div lang="ru" className="russian-transcript">
                {text.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p role="status">Loading section…</p>
            )}
          </>
        )}
      </section>
      <nav className="book-pagination" aria-label="Book section navigation">
        {previous ? (
          <Link to={`/brahmachari/${previous.id}`} state={{ collectionSearch }}>
            <ArrowLeft size={17} />
            {previous.iast}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/brahmachari/${next.id}`} state={{ collectionSearch }}>
            {next.iast}
            <ArrowRight size={17} />
          </Link>
        )}
      </nav>
      <dialog
        ref={dialog}
        className="book-lightbox"
        aria-label={`${e.iast} source illustration`}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight' && selected < e.images.length - 1) {
            event.preventDefault();
            setSelected(selected + 1);
          }
          if (event.key === 'ArrowLeft' && selected > 0) {
            event.preventDefault();
            setSelected(selected - 1);
          }
        }}
      >
        <button
          className="icon-button"
          aria-label="Close enlarged illustration"
          onClick={() => dialog.current?.close()}
        >
          <X size={23} />
        </button>
        <img src={current.src} alt={`${e.name}, enlarged EPUB illustration ${current.id}`} />
        <p>
          {e.iast} · {current.id} · {selected + 1}/{e.images.length}
        </p>
        <div>
          <button className="button" disabled={!selected} onClick={() => setSelected((n) => n - 1)}>
            Previous
          </button>
          <button
            className="button"
            disabled={selected === e.images.length - 1}
            onClick={() => setSelected((n) => n + 1)}
          >
            Next
          </button>
        </div>
      </dialog>
    </main>
  );
}
