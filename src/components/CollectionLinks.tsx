import { LanguageSelector, useLanguage } from '../core/language';
import { contactText } from '../data/contact';
import { Link } from 'react-router-dom';
export default function CollectionLinks() {
  const { language } = useLanguage();
  return (
    <nav className="collection-links" aria-label="Book workspace">
      <Link to="/">
        Dhirendra Brahmachari <span>108 asanas</span>
      </Link>
      <Link to="/sequence">Build a book sequence</Link>
      <Link to="/audit">{contactText[language].report}</Link>
      <LanguageSelector />
    </nav>
  );
}
