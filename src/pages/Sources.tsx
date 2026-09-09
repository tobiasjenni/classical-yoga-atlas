import { ArrowUpRight, BookOpen, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { asanas } from '../data';
import book from '../data/brahmachari.json';
export default function Sources() {
  return (
    <main className="page sources-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE EDITORIAL FOUNDATION</span>
          <h1>
            Return to the source<span className="period">.</span>
          </h1>
          <p>A historical atlas is only as useful as its provenance.</p>
        </div>
        <BookOpen size={35} strokeWidth={1} />
      </div>
      <section className="notes-block traditional" id="brahmachari">
        <span className="eyebrow">PRIMARY SOURCE · 108 ASANAS</span>
        <h2>Yogāsana Vijñāna — Dhirendra Brahmachari</h2>
        <p>
          The atlas now follows the complete posture collection in the user-supplied Russian EPUB:
          108 asana sections, 185 illustrations and a separate twelve-picture Sūrya Namaskāra
          sequence.
        </p>
        <p>
          Every asana has a Sanskrit name in Devanagari and IAST, an English label, the original
          Russian heading, its source illustrations and an original static 3D pose study. Exact
          contacts and movement remain unverified reconstructions. Sanskrit spellings and English
          labels are editorial normalizations; the original heading is retained for comparison.
        </p>
        <Link to="/" className="button">
          Open the 108-asana atlas <ArrowUpRight size={16} />
        </Link>
        <h3>Edition and source locations</h3>
        <p>
          <a href="/audits/blender/">Blender render audit</a> — compare both model appearances with
          the book pictures and read the remaining visual findings.
        </p>
        <p>
          {book.edition} {book.locatorPolicy}
        </p>
        <p>{book.metadataNote}</p>
        <p className="micro">
          The previously identified 1970 English catalogue record is a different edition. Its page
          numbers and publication details are not assigned to this Russian EPUB.
        </p>
        <details>
          <summary>Imported document identity</summary>
          <p className="micro">{book.filename}</p>
          <p className="micro" style={{ overflowWrap: 'anywhere' }}>
            SHA-256: {book.sha256}
          </p>
        </details>
      </section>
      <section className="notes-block">
        <span className="eyebrow">SECONDARY COMPARISON · 15 ANIMATED STUDIES</span>
        <h2>Haṭha Yoga Pradīpikā</h2>
        <p>
          Svātmārāma. English translation by Pancham Sinh, Panini Office, Allahabad, 1914. The
          earlier fifteen reconstructions remain available separately. Shared posture names do not
          imply identical configurations across these sources.
        </p>
        <Link to="/hyp" className="text-button">
          Open HYP comparisons <ArrowUpRight size={16} />
        </Link>
        <a
          href="https://sacred-texts.com/hin/hyp/hyp03.htm"
          target="_blank"
          rel="noreferrer"
          className="text-button"
        >
          Read the earlier source <ArrowUpRight size={16} />
        </a>
      </section>
      <div className="notes-grid two">
        <section className="notes-block">
          <span className="verified">
            <Check size={14} /> ATTESTED
          </span>
          <h2>What the citation verifies</h2>
          <p>
            The posture name and its occurrence in the identified passage. It does not authenticate
            every angle of the 3D reconstruction, every English label or a medical claim.
          </p>
        </section>
        <section className="notes-block modern">
          <span className="unverified-tag">UNVERIFIED</span>
          <h2>What the model proposes</h2>
          <p>
            Movement, entry and exit, timings, difficulty and selected joints are editorial
            reconstructions. Shipped flows are checked against simplified body and floor boundaries;
            the mannequin does not simulate tissue strain, balance or individual anatomy.
          </p>
        </section>
      </div>
      <h2 className="section-title">The HYP comparison inventory</h2>
      <div className="source-table">
        <table>
          <thead>
            <tr>
              <th>Posture</th>
              <th>Chapter · verse</th>
              <th>Movement provenance</th>
            </tr>
          </thead>
          <tbody>
            {[...asanas]
              .sort((a, b) => parseInt(a.source[0].verse) - parseInt(b.source[0].verse))
              .map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/asana/${a.id}`}>{a.iast}</Link>
                  </td>
                  <td>1.{a.source[0].verse}</td>
                  <td>
                    <span className="unverified-tag">unverified reconstruction</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <section className="notes-block">
        <h2>Beyond the first volume</h2>
        <p>
          Gheranda Samhita, Shiva Samhita and Sritattvanidhi are deferred until their inventories
          and source references can be verified. Yoga Makaranda (1934) and Light on Yoga (1966) will
          belong to a separately labelled transitional tier. No entries from these tiers are
          published in this version.
        </p>
      </section>
      <section className="notes-block">
        <h2>Contributing a posture</h2>
        <p>
          Use the pose studio to author a complete flow. Export its JSON, attach edition-specific
          source metadata, and distinguish evidence from interpretation. The repository README
          documents validation and submission end to end.
        </p>
        <Link to="/studio" className="button">
          Open the pose studio <ArrowUpRight size={15} />
        </Link>
      </section>
    </main>
  );
}
