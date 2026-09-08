import { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { BrowserRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  Flower2,
  GitCompareArrows,
  Grid2X2,
  Layers,
  Menu,
  Moon,
  PencilRuler,
  Sun,
  X,
} from 'lucide-react';
import { useModalFocus } from './core/modal-focus';
import { usePlayerClock } from './core/player';
const Atlas = lazy(() => import('./pages/Atlas'));
const Studio = lazy(() => import('./pages/Studio'));
const Detail = lazy(() => import('./pages/Detail'));
const Compare = lazy(() => import('./pages/Compare'));
const Sequence = lazy(() => import('./pages/Sequence'));
const Sources = lazy(() => import('./pages/Sources'));
const Brahmachari = lazy(() => import('./pages/Brahmachari'));
function Shell() {
  const [open, setOpen] = useState(false),
    [dark, setDark] = useState(() => {
      try {
        return localStorage.getItem('atlas-theme') === 'dark';
      } catch {
        return false;
      }
    });
  const location = useLocation();
  const navigation = useRef<HTMLElement>(null);
  useModalFocus(open, navigation, () => setOpen(false));
  usePlayerClock();
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('atlas-theme', dark ? 'dark' : 'light');
    } catch {}
  }, [dark]);
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
    document.getElementById('main-content')?.focus({ preventScroll: true });
    const titles: Record<string, string> = {
      '/': '108 asanas',
      '/brahmachari': '108 asanas',
      '/hyp': 'HYP comparison library',
      '/studio': 'Pose studio',
      '/compare': 'Compare HYP poses',
      '/sequence': 'HYP sequences',
      '/sources': 'Sources & approach',
    };
    if (titles[location.pathname])
      document.title = `${titles[location.pathname]} · Classical Yoga Atlas`;
  }, [location.pathname]);
  useEffect(() => {
    if (!location.hash) return;
    let anchor = location.hash.slice(1);
    try {
      anchor = decodeURIComponent(anchor);
    } catch {
      /* Keep malformed fragments literal. */
    }
    let observer: MutationObserver | undefined;
    const scroll = () => {
      const node = document.getElementById(anchor);
      if (node) {
        node.scrollIntoView();
        observer?.disconnect();
        return true;
      }
      return false;
    };
    if (!scroll()) {
      observer = new MutationObserver(scroll);
      observer.observe(document.getElementById('main-content')!, {
        childList: true,
        subtree: true,
      });
    }
    return () => observer?.disconnect();
  }, [location.pathname, location.hash]);
  const nav = [
    { to: '/', icon: Grid2X2, label: 'Asana atlas', end: true },
    { to: '/hyp', icon: BookOpen, label: 'HYP comparisons' },
    { to: '/compare', icon: GitCompareArrows, label: 'Compare HYP poses' },
    { to: '/sequence', icon: Layers, label: 'HYP sequences' },
    { to: '/studio', icon: PencilRuler, label: 'Pose studio' },
  ];
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="mobile-header">
        <NavLink to="/" className="brand">
          <Flower2 size={25} />
          <span>Classical Yoga Atlas</span>
        </NavLink>
        <button
          className="icon-button"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      {open && (
        <button
          className="nav-scrim"
          data-modal-dismiss
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={navigation}
        className={`sidebar ${open ? 'open' : ''}`}
        role={open ? 'dialog' : undefined}
        aria-modal={open || undefined}
        aria-label="Site navigation"
        tabIndex={-1}
      >
        {open && (
          <button
            className="icon-button drawer-close"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        )}
        <NavLink to="/" className="brand">
          <span className="brand-mark">
            <Flower2 size={32} strokeWidth={1.1} />
          </span>
          <span>
            Classical
            <br />
            Yoga Atlas<small>A LIVING REFERENCE</small>
          </span>
        </NavLink>
        <div className="nav-label">EXPLORE</div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                isActive || (n.to === '/' && location.pathname.startsWith('/brahmachari'))
                  ? 'nav-item active'
                  : 'nav-item'
              }
            >
              <n.icon size={18} strokeWidth={1.5} />
              {n.label}
              {n.to === '/' && <span className="nav-count">108</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-rule" />
        <div className="nav-label">THE REFERENCE</div>
        <NavLink
          to="/sources"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <BookOpen size={18} strokeWidth={1.5} /> Sources & approach
        </NavLink>
        <div className="sidebar-bottom">
          <div className="sidebar-quote">
            <span className="quote-line" />
            <p>
              A study of form.
              <br />A respect for origins.
            </p>
            <span>HISTORY IN THREE DIMENSIONS</span>
          </div>
          <div className="theme-control">
            <span>Appearance</span>
            <button
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
              className="icon-button"
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
          <span className="sidebar-version">
            CLASSICAL CORPUS <span>v0.1</span>
          </span>
        </div>
      </aside>
      <div className="app-content" id="main-content" tabIndex={-1}>
        <Suspense fallback={<main className="page loading">Opening the atlas…</main>}>
          <Routes>
            <Route path="/" element={<Brahmachari />} />
            <Route path="/hyp" element={<Atlas />} />
            <Route path="/asana/:id" element={<Detail />} />
            <Route path="/brahmachari" element={<Brahmachari />} />
            <Route path="/brahmachari/:id" element={<Brahmachari />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/sequence" element={<Sequence />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/sources" element={<Sources />} />
            <Route
              path="*"
              element={
                <main className="page empty-state">
                  <h1>Page not found</h1>
                  <NavLink to="/" className="button">
                    Return to the atlas <ArrowUpRight size={15} />
                  </NavLink>
                </main>
              }
            />
          </Routes>
        </Suspense>
        <footer className="site-footer">
          <Flower2 size={20} strokeWidth={1.2} />
          <p>
            A historical and educational reference.{' '}
            <strong>Not medical or therapeutic advice.</strong>
            <br />
            <span>
              3D figures and movement are unverified reconstructions, not practice instructions.
            </span>
          </p>
          <span className="footer-right">
            ROOTED IN TEXT.
            <br />
            OPEN TO EXPLORATION.
          </span>
        </footer>
      </div>
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
