import { Link } from 'react-router-dom';
export default function CollectionLinks({ active = 'hyp' }: { active?: 'hyp' | 'book' }) {
  return (
    <nav className="collection-links" aria-label="Source collection">
      <Link to="/" aria-current={active === 'book' ? 'page' : undefined}>
        Dhirendra Brahmachari <span>108 asanas</span>
      </Link>
      <Link to="/hyp" aria-current={active === 'hyp' ? 'page' : undefined}>
        Haṭha Yoga Pradīpikā <span>15 models</span>
      </Link>
    </nav>
  );
}
