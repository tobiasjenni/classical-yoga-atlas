# Licenses and attribution

## Atlas mannequin

The humanoid in `src/core/rig.ts` is original procedural geometry and a real Three.js SkinnedMesh, created for this project. It is licensed under MIT, together with the rig generator and animation tooling (see LICENSE). No Mixamo, Adobe, VRoid, VRM, or other third-party model or animation is redistributed. Bone identifiers use the Mixamo convention; this is a naming compatibility choice, not a claim that this is Adobe's XBot. The rest orientation and dimensions are documented in code; imported poses require retargeting if their rest axes differ.

The geometry and material are cached once per page. Each simultaneously visible pose needs its own skeleton and mesh object so it can have a different transform; those objects share the same geometry/material. One scene object cannot legally belong to multiple parents or have two poses at once.

## Historical text

Source: Svātmārāma, Hatha Yoga Pradipika, translated by Pancham Sinh, Panini Office, Allahabad (1914). Digital edition: https://sacred-texts.com/hin/hyp/hyp00.htm ; chapter: https://sacred-texts.com/hin/hyp/hyp03.htm . The archive identifies this edition as public domain in the United States. Entries link to the chapter and record its exact verse numbering. Names are normalized; the archive contains transcription and translation inconsistencies. The project uses brief attributed summaries, not its scans or illustrations.

## Software

React / React DOM, React Three Fiber, Drei, Zustand, Vite, Tailwind CSS, Zod, Prettier and Three.js: MIT. Lucide React: ISC. TypeScript: Apache-2.0. Dependency licenses remain in their packages. The lockfile records exact installed versions.

## User-supplied Brahmachari book

Dhirendra Brahmachari, _Yogāsana Vijñāna_, Russian EPUB supplied by the user as `Brahmachari_Yogasana-Vidzhnyana.334833.fb2.epub`. Translator, publisher and publication year are unverified. The source identity and locators are recorded in `src/data/brahmachari.json` and `BRAHMACHARI_REVIEW.md`.

The 185 original pictures and extracted Russian paragraphs in `public/book/brahmachari/` are source material, **not MIT-licensed application assets**. Their existing copyright, attribution and watermarks remain with the original rights holders. No ownership or redistribution license is asserted by this project. The user requested inclusion of these source materials and publication of the atlas on GitHub and the web. Publication does not change their copyright or imply that these materials are MIT-licensed.

English visual summaries, normalized labels and the 108 skeletal studies are original editorial work. Their uncertainty is documented; the book’s historical claims are not adopted as medical guidance.
