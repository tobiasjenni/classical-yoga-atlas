# Classical Yoga Atlas audit — 8 September 2026

The audit found and fixed substantial source/model mismatches and several usability defects. The application works as an illustrated reference, but its 3D studies must remain labelled **unverified**. Passing geometry tests does not establish agreement with a photograph or validate a movement.

## Scope and evidence

- Reviewed all 108 primary posture photographs using contact sheets, with original Russian descriptions consulted for ambiguous configurations. This was a source/configuration review; detailed rendered-model comparisons were representative rather than a frame-by-frame anatomical review of all models.
- Independently compared the committed content against the supplied EPUB: **109 exact headings, 185 byte-identical images and 647 unchanged Russian paragraphs**. All 108 postures have Sanskrit/IAST and English labels. Rare Sanskrit spellings remain editorial normalizations from Russian.
- Checked all **108 posture pages** in the production browser: one heading, one viewer canvas, a source-picture link, and no horizontal page overflow. All nine catalogue pages contain 108 unique posture links. Sūrya Namaskāra retains twelve ordered pictures and no substituted 3D animation.
- Exercised search, family filtering, pagination, retained search on return, picture/model views, image navigation, enlarged images, keyboard dismissal, focus restoration, viewer zoom and enlargement, and mobile navigation.
- Inspected responsive layouts at 320, 390, 768 and 1440 pixels, including light and dark themes. Secondary library, comparison, sequence, studio, sources and not-found routes were checked; the five main secondary pages were also checked for mobile overflow.

## Findings corrected

| Priority | Finding                                                                                                                                               | Result                                                                                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Distinct asanas shared generic configurations, including a leg-behind-head Kālabhairava and a seated version of the book’s standing toe-to-nose fold. | **34 pose configurations revised** from the book’s photographs and descriptions; source-specific stances, arm positions, leg positions and foot orientations corrected.                                                                                    |
| High     | Five primary pictures showed another variant or preparation instead of the modelled configuration.                                                    | Uttāna-maṇḍūka → Im43; Baddha-padma → Im64; Garbha → Im76; Titibha → Im91; Śīrṣa → Im130. Invalid explicitly chosen image IDs now stop the importer instead of silently falling back.                                                                      |
| Medium   | Several family labels contradicted the selected source picture.                                                                                       | Parvata: kneeling; Supta-vṛścika: prone; Pādāṅguṣṭha-nāsā-sparśa: standing; Pūrṇa-cakra: balance. English labels/descriptions updated accordingly.                                                                                                         |
| High     | The main route pulled the large secondary HYP animation dataset into initial loading.                                                                 | Removed eager imports from the application shell and thumbnails; HYP comparison models load only when requested. Main entry chunk decreased from about 1,319 KB to 16.8 KB minified. This is a chunk-size comparison, not a measured total-page speedup.   |
| Medium   | The library requested 108 previews at once and offered little orientation or return context.                                                          | Twelve cards per page, nine pages, full-width multilingual search, family/review/sort controls, persistent query links and restored collection filters. Sun salutation is listed separately and remains searchable.                                        |
| Medium   | Viewer controls obscured viewing space and lacked keyboard zoom/back view. Expanded surfaces lacked complete focus handling.                          | Separate control rows, front/side/back/top/three-quarter views, keyboard zoom/reset, mobile model-first view, focus containment, Escape dismissal and focus restoration.                                                                                   |
| Medium   | Mobile sequence content expanded the grid far beyond the viewport.                                                                                    | Grid children and sequence inputs now shrink correctly around the scrollable timeline; verified at 390 pixels.                                                                                                                                             |
| Medium   | Router dependency had two moderate audit reports.                                                                                                     | Updated React Router DOM to 7.18.3; the lockfile audit now reports **zero known vulnerabilities**. [Redirect advisory](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6), [official migration guidance](https://reactrouter.com/6.30.3/upgrading/future). |
| Low      | Weak text contrast, inconsistent metadata sizes, missing route titles and source-text failure recovery.                                               | Improved muted colors/readability, route titles, single-picture wording, source-image URL state and a retry action for failed Russian-text loading.                                                                                                        |

Representative rendered comparisons included Gomukha, Kālabhairava, Sarvāṅga, Mṛga, Śīrṣa and Meru-daṇḍa. The Sarvāṅga inspection prompted a further correction to neck position, leg extension and grounded arm direction. The Mṛga study now targets the actual raised knee and places the opposite hand beside the cheek. These remain schematic reconstructions with approximate contact.

## Checks

- `npm test`: **40 passing tests** across five files. A final targeted rerun of the seven book tests passed after the last foot-orientation refinement.
- `npm run build`: source validation, TypeScript checking and production compilation passed.
- `npm audit --json`: zero reported vulnerabilities across the installed dependency tree.
- `python scripts/audit-book-source.py /path/to/book.epub`: original headings, pictures and Russian paragraphs matched.
- Book geometry checks cover all finite vertices in both mesh styles, floor clearance, simplified torso/head clearance, the distinctive grounded standing stance and overhead fold, and distinct seated balances.
- Existing HYP tests sample all fifteen animations, including mirrored playback and between-keyframe torso/head clearance. Their successful result is not proof of full anatomical correctness.
- No browser console errors appeared during the all-posture route pass and secondary-page checks.
- The library’s sampled solid-background text contrast checks found no failures after the color changes. This excludes gradients, placeholders and opacity-composited text and is not a formal WCAG certification.

## Open accuracy and release limits

**Thirteen studies retain a contact-refinement flag:** Gorakṣa, Koṇa, Baka, Titibha, Viparīta-śīrṣa-dvihasta-baddha, Ekapāda-bhuja, Dvipāda-bhuja, Śīrṣa-jānu-sparśa, Supta-vṛścika, Śīrṣa, Preta, Meru-daṇḍa and Kukila. Use the library’s “Contacts need refinement” filter to inspect them. The flag means the geometry correction exceeded 10 cm or a clearance threshold; it is not a correctness score for the other 95 studies.

All 108 models are static interpretations of one selected photograph per section. They do not reproduce every variant or establish entry/exit motion. The shared rig and torso/head clearance detector do not enforce full limb-to-limb or finger contact, every anatomical joint limit, balance or individual proportions. Exact grips, deep folds and backbends require further specialist review. The Russian EPUB alone does not establish canonical Sanskrit spellings for rare names.

No screen reader, physical touch device, WebGL-loss simulation, formal WCAG conformance test, runtime performance benchmark or independent yoga/anatomy expert review was performed. Large Three.js and deferred HYP-data chunks still produce Vite size advisories. Local production preview was tested; no public deployment or remote CI run was performed.

## Reproduce

```sh
npm test
npm run build
npm run format:check
npm audit
python scripts/audit-book-source.py /path/to/book.epub
```

The source audit is read-only. A normal build uses the committed content and does not need the original EPUB. See [BRAHMACHARI_REVIEW.md](BRAHMACHARI_REVIEW.md) for the authoring process and edition limitations.
