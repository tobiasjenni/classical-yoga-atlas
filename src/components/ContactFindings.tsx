import { Link } from 'react-router-dom';
import { contactIssues, contacts, contactText } from '../data/contact';
import { useLanguage } from '../core/language';
export default function ContactFindings({
  id,
  expanded = false,
}: {
  id: string;
  expanded?: boolean;
}) {
  const { language } = useLanguage(),
    t = contactText[language],
    r = contacts[id];
  if (!r) return null;
  const findings = (
    <div className="contact-findings" lang={language}>
      {(['hands', 'feet'] as const).map((part) => (
        <section key={part}>
          <h4>{t[part]}</h4>
          <ul>
            {r[part].map((code) => (
              <li key={code} data-status={contactIssues[code].status}>
                {contactIssues[code][language]}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section>
        <h4>{t.fingers}</h4>
        <p>
          <strong>{t.fingerModes[r.fingers as keyof typeof t.fingerModes]}</strong>
        </p>
        <p>
          {['obscured', 'unclear', 'gesture_unclear'].includes(r.fingers)
            ? t.sourceLimit
            : t.fingerLimit}
        </p>
      </section>
    </div>
  );
  if (expanded) return findings;
  return (
    <section className="contact-notice" lang={language}>
      <span className="contact-status">{t.corrections}</span>
      <details>
        <summary>{t.detail}</summary>
        {findings}
        <p>{t.limitation}</p>
      </details>
      <Link to={`/audit?q=${encodeURIComponent(id)}`}>{t.report} →</Link>
    </section>
  );
}
