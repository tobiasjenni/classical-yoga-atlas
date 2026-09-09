import { Link } from 'react-router-dom';
export default function CollectionLinks() {
  return (
    <nav className="collection-links" aria-label="Book workspace">
      <Link to="/">
        Dhirendra Brahmachari <span>108 asanas</span>
      </Link>
      <Link to="/sequence">Build a book sequence</Link>
    </nav>
  );
}
