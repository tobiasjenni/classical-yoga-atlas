# Brahmachari collection review — 8 September 2026

## Scope and source

The primary atlas follows all **108 named posture sections** in the user-supplied Russian _Yogāsana Vijñāna_, in book order. The final Sūrya Namaskāra section is separate: 109 sections overall, with 185 original illustrations (Im2–Im186), of which twelve illustrate the sun salutation. The introductory portrait is not counted. Each posture has a normalized Sanskrit name in IAST and Devanagari, an English label, the original Russian heading and one static 3D study.

Source SHA-256: `59c0b4ea7d9810795cd6bf6a16afbe11c0148dbf3c979d891f98341a72c2d0ff`.

The EPUB metadata says 1953, but its foreword is dated 29 December 1966. Translator, publisher and publication year remain unverified. Locations use the actual XHTML filename, section heading and EPUB image ID. Image IDs are not printed plate numbers; section order is not pagination. The separate 1970 English edition’s bibliographic details are not assigned to this file.

Sanskrit spellings and English labels are editorial normalizations from the Russian headings. Rare names have not been collated against a Sanskrit edition. The source heading remains visible so readers can identify the section without relying on the normalization. English summaries describe the illustrations; original Russian text is available separately, including its historical claims.

## Source-specific forms

| Name                | Form used from the book                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| Bhadrāsana          | Kneeling on the heels, hands reaching behind toward the toes                                   |
| Siṃhāsana           | Open knees and raised heels supported on the toes                                              |
| Gomukhāsana         | Folded legs with a behind-back arm clasp                                                       |
| Vīrāsana            | Lunge with one arm extended forward and the other bent behind the waist                        |
| Dhanurāsana         | Overhead leg fold with a toe reach; the seated archer appears separately as Ākarṇa-dhanurāsana |
| Kūrmāsana           | Kneeling forward inclination                                                                   |
| Uttāna-kūrmāsana    | Reclined kneeling backbend                                                                     |
| Vṛkṣāsana           | Handstand variants                                                                             |
| Uṣṭrāsana           | Prone bow shape with a foot hold                                                               |
| Sarvāṅgāsana        | Overhead legs; the upright version appears separately as Ūrdhva-sarvāṅgāsana                   |
| Kākāsana / Bakāsana | Squat / arm balance respectively                                                               |
| Pūrvottānāsana      | Seated leg-lift balance with foot holds                                                        |

The earlier fifteen HYP flows remain secondary and retain their own source identities. Name overlap does not mean the configurations agree.

## Models and limitations

All 108 studies are original poses on the shared 22-bone rig. Both Human and Reference appearance are available, with orbit, camera presets and an X-ray limb overlay. The model is explicitly linked to its primary EPUB image; selecting a different photograph does not silently switch the model to another variant.

These are **static schematic reconstructions**, not 108 newly authored animations. A single photograph does not establish an entry/exit path, hidden joint angles or precise hand grips. Sūrya Namaskāra has twelve source pictures and no reconstructed 3D sequence. Complex binds, deep backbends and folds retain approximate contacts. Simplified torso/head clearance is not a complete limb-to-limb collision model, joint-limit solver, balance simulation or individualized anatomy model.

The authoring pipeline adjusts elbow/knee bend planes and, where obstructed, end points. It preserves fixed bone lengths and then checks both complete mesh styles against the floor. Geometry corrections alone do not certify agreement with the photograph. Every model remains labelled unverified. Thirteen models with a position correction over 10 cm carry an additional contact-refinement note; that threshold is a diagnostic, not an accuracy grade for the other models. Gallery photographs are kept alongside the model for direct comparison.

The subsequent [full application audit](AUDIT.md) corrected 34 pose configurations, five primary-picture selections and four family labels. It also reviewed the 108 primary photographs, preserved all source assets, and checked rendering on every posture page.

## Reproduce

From the repository root, with Python 3 and Node 22.18+:

```sh
python scripts/import-brahmachari.py /path/to/Brahmachari_Yogasana-Vidzhnyana.334833.fb2.epub
node --experimental-strip-types scripts/author-brahmachari.ts
npm run format
npm test
npm run build
```

The importer uses ZIP/XML from Python’s standard library. `scripts/book/catalogue.txt` and `scripts/book/sanskrit.txt` hold the editorial labels in book order. The manifest and static poses are committed, so a normal build does not require the original EPUB or Python. Regeneration replaces generated records and should be intentional.

The build validator checks all names, section/model links, original illustration hashes and source-image membership. The book tests check the 108-model inventory, both posed meshes against the floor, torso/head clearance and distinguishing features of the book’s lunge, fold, kneeling seat and handstand. Existing HYP movement tests remain separate. See [VERIFICATION.md](VERIFICATION.md) for execution results.
