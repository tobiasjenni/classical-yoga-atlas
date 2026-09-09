import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Language } from '../data/contact';
const LanguageContext = createContext<{ language: Language; setLanguage: (v: Language) => void }>({
  language: 'en',
  setLanguage: () => {},
});
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, update] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('atlas-description-language');
      return saved === 'de' || saved === 'ru' ? saved : 'en';
    } catch {
      return 'en';
    }
  });
  function setLanguage(value: Language) {
    update(value);
    try {
      localStorage.setItem('atlas-description-language', value);
    } catch {}
  }
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  return (
    <label className="description-language">
      <span>
        {language === 'de' ? 'Beschreibungen' : language === 'ru' ? 'Описания' : 'Descriptions'}
      </span>
      <select
        aria-label="Description language"
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
      >
        <option value="en">English</option>
        <option value="de">Deutsch</option>
        <option value="ru">Русский</option>
      </select>
    </label>
  );
}
