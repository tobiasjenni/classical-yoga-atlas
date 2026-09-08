# Classical Yoga Atlas

[Open the live atlas](https://classical-yoga-atlas.toebu-jenni.workers.dev) · [GitHub repository](https://github.com/tobiasjenni/classical-yoga-atlas)

A source-led reference built around Dhirendra Brahmachari’s **108-asana Yogāsana Vijñāna** collection from the user-supplied Russian EPUB. Every posture has Sanskrit (Devanagari and IAST), an English label, original illustrations and a rotatable static 3D study. The book’s twelve-stage Sūrya Namaskāra is included separately as pictures. Fifteen earlier Hatha Yoga Pradipika animations remain available as secondary comparisons.

**Historical and educational reference; not medical or therapeutic advice.** Russian section headings, passages and illustrations are preserved from the supplied book; Sanskrit spellings and English labels are editorial normalizations. Every movement is explicitly an **unverified schematic reconstruction**, not a safe-practice prescription or a biomechanical simulation.

## Run locally

Requires Node **22.18+** (or Node 24) and npm.

```sh
npm ci
npm run dev
```

To verify and serve the production bundle:

```sh
npm test
npm run build
npm run preview -- --port 5173
```

Open `http://127.0.0.1:5173`. Vite's dev command otherwise uses its default port, 5173; preview otherwise defaults to 4173.

The native config loader and native TypeScript stripping avoid a dependency on a TypeScript CLI's temporary user directory. In the restricted Windows agent sandbox, Vite's development dependency optimizer could not enumerate an ancestor directory. The production build and preview server worked and were used for browser verification. This sandbox limitation does not affect the static bundle.

## Routes and controls

The book library opens with original pictures by default. Select **3D studies** to switch to interactive previews, each with a small source photograph. Images remain available while the 3D viewer loads.

## Publish updates

The live site uses Cloudflare Workers static assets with single-page application routing. After authenticating with `npx wrangler login`, run `npm run deploy` to rebuild and publish. The committed `wrangler.jsonc` sets the worker name and routing; no API keys belong in this repository.

Run `npm run verify:site -- https://classical-yoga-atlas.toebu-jenni.workers.dev` after deployment. This checks all 185 source pictures against their recorded SHA-256 hashes and checks six direct application routes. GitHub CI validates the data, runs tests, and builds on every push; it does not deploy automatically.

## Routes

| Route                                      | Purpose                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` or `/brahmachari`                      | Main book atlas: 108 postures plus Sūrya Namaskāra; multilingual search, family filters, Human/Reference 3D thumbnails or original pictures |
| `/brahmachari/:id`                         | Sanskrit/English names, book pictures, static 3D study, original Russian section and exact EPUB locator                                     |
| `/hyp`                                     | Secondary 15-asana HYP atlas and its filters                                                                                                |
| `/asana/:id`                               | Animated entry, hold and exit; source citation; separated historical claims, editorial context and missing information                      |
| `/studio`                                  | FK/IK authoring, mirroring, root transforms, keyframes, local drafts, undo/redo and JSON import/export                                      |
| `/compare?left=padmasana&right=siddhasana` | Two viewers driven by the same normalized playback time                                                                                     |
| `/sequence`                                | Drag/add, reorder, continuous playback and sequence JSON import/export                                                                      |
| `/sources`                                 | Primary book attribution, edition limitations and secondary HYP inventory                                                                   |

Book models are static pose studies, with one primary illustration represented per section. They do not claim to reproduce all illustrated variants or entry/exit movements. See [BRAHMACHARI_REVIEW.md](BRAHMACHARI_REVIEW.md) and the [full application audit](AUDIT.md).

Viewer: drag to orbit, right-drag/two-finger drag to pan, wheel/pinch to zoom. Front/side/back/top/three-quarter buttons, zoom buttons and reset provide keyboard alternatives to the pointer controls. Play starts a full flow on first activation. Speed ranges from 0.25× to 2×. Selecting a keyframe enters static step-through mode; uncheck it to resume animation. Loop playback is optional. Joint markers are author-selected and unverified.

The OS `prefers-reduced-motion` setting disables continuous playback and displays static pose targets with the same step buttons and instructions. Themes, studio drafts and sequences are saved on the device; no account or backend is involved. Export JSON for a portable copy. No third-party analytics or remote model/font requests are used.

## Author a new asana, end to end

1. **Check corpus scope first.** The primary collection contains all 108 posture sections in the supplied Brahmachari book. Its static models and picture provenance are described in [BRAHMACHARI_REVIEW.md](BRAHMACHARI_REVIEW.md). The instructions below describe the separate flow editor and fifteen HYP comparison records. Compare and Sequence currently use those HYP flows. Do not substitute a similarly named pose from another source.
2. **Identify a passage and edition.** Record the text, chapter, verse/verse range, edition and source URL. Do not transfer verse numbers from another edition. If the location is unknown, use empty chapter/verse fields and `provenance: "unverified"`; never guess a number. An entry can be `attested` only if it has an attested source.
3. **Open `/studio`.** Start with a new flow, load an existing seed, or import a previously exported JSON file. Existing-record imports preserve the metadata. A source-linked studio URL resumes its matching local draft.
4. **Author the neutral position.** All 22 bones are selectable. Numeric X/Y/Z controls provide keyboard-accessible local Euler rotation in degrees; export stores normalized quaternions. Root position is measured in metres. Root rotation handles reclined/inverted orientations independently of the hip bone.
5. **Author the flow in order:** `neutral → prep → transition[1..n] → final → hold → exit → neutral`. Select timeline targets, duplicate/add/delete and move them earlier/later. Assign durations, easing and concise observational instructions. Final and hold poses are linked; editing either updates both. The two neutral endpoints are also linked. Durations and instructions remain independent.
6. **Use FK or IK.** FK exposes a local rotation gizmo. Limb IK exposes a world-space translation gizmo for a hand or foot and analytically solves its two-bone chain. Targets outside reach are clamped. Numeric FK remains available on every device. Mirroring reflects the whole current pose across the sagittal plane, including root transforms. Undo/redo keeps 40 changes.
7. **Mark uncertainty.** Highlight selected joints only as editorial annotations. Free/inhale/exhale/retain are available authoring markers, not verified source instructions. Current v1 movement, anatomy and difficulty provenance is deliberately restricted to `unverified`.
8. **Export.** Export checks the schema, phase ordering, complete bone maps, unit quaternions, matching neutral endpoints and an unchanged hold. A new unnamed flow exports `{schemaVersion: 1, kind: "asana-flow", keyframes: [...]}`. An existing record exports the complete asana. Invalid flows are blocked with an explanation.
9. **Create the record.** Copy an existing JSON record to `src/data/asanas/your-kebab-id.json`, change the identity and source metadata, and replace its `keyframes` with your exported targets. Remove inherited claims, aliases, related links and notes that do not apply. Follow `src/core/schema.ts` for all required fields. Empty arrays are valid for unknown contraindications, counterposes and claims; the UI explains their absence. `fieldProvenance` records uncertainty separately for movement, difficulty, anatomy, contraindications, breath and gaze.
10. **Separate types of evidence.** Put brief, cited historical assertions in `traditionalClaims`. Put modern commentary in `modernNotes`, and translation/pose ambiguity in `interpretationNotes`. Do not turn a historical therapeutic claim into a modern clinical recommendation. `relatedAsanas` are editorial navigation, not a classical sequence.
11. **Validate and inspect.** Run `npm run validate`, `npm test` and `npm run build`. Inspect all target poses, all intermediate transitions, multiple camera angles, a narrow viewport and static stepping. Check for floor penetration, implausible joint direction, missing contact and incorrect naming. These cannot be certified by Zod.
12. **Contribute.** Commit the JSON and any source notes. In a pull request, cite the edition and passages, explain interpretive choices, and identify which aspects remain unverified. CI fails on invalid records, broken references, failed tests or a failed build.

Imports do not publish to the atlas or write the repository. Copy an exported record into the data directory and rebuild to publish it. Local drafts can be reset with **New flow**, and exports can be imported again. Sequence export stores ordered asana IDs and bridge duration; studio export stores authored poses.

## Pose and animation contract

Each file has `schemaVersion: 1`. `pose.bones` maps **every** supported Mixamo-style bone name to `[x,y,z,w]`; rotations must be finite, normalized unit quaternions. The root contains `{position:[x,y,z], rotation:[x,y,z,w]}`. World coordinates: metres, +Y up, +Z forward. Bone quaternions are local to the original mannequin's documented rest axes. Imported Mixamo/VRM poses with different rest axes must be retargeted; naming alone does not establish transform compatibility.

Each keyframe's `duration` is the time **to arrive at that target**, interpolating from the preceding keyframe. The first keyframe remains static for its duration. A hold repeats the final pose. Slerp follows the shortest quaternion arc, root positions use linear interpolation, and easing is applied once to segment progress. The start/end neutral must match for a continuous loop. Playback uses one shared clock, with UI readouts updated less frequently than the model. The clock stops when paused and freezes progress in a hidden document.

Sequence bridges interpolate from the previous final-neutral target to the next initial-neutral target. Compare normalizes the left timeline to the right timeline's duration. With the seven-frame seed flows, their phases align; arbitrary authoring with different phase durations may not align semantic phases. The displayed comparison instruction is explicitly the left posture's instruction.

## Source edition and seed inventory

Svātmārāma, _Hatha Yoga Pradipika_, translated by Pancham Sinh, Panini Office, Allahabad, 1914. [Edition record](https://sacred-texts.com/hin/hyp/hyp00.htm), [chapter 1](https://sacred-texts.com/hin/hyp/hyp03.htm). Citations were checked against this chapter on 7 September 2026. The digital text includes transcription/translation inconsistencies, which are flagged in relevant entries.

| ID                | Name             | Chapter 1 verses |
| ----------------- | ---------------- | ---------------- |
| svastikasana      | Svastikāsana     | 21               |
| gomukhasana       | Gomukhāsana      | 22               |
| virasana          | Vīrāsana         | 23               |
| kurmasana         | Kūrmāsana        | 24               |
| kukkutasana       | Kukkuṭāsana      | 25               |
| uttana-kurmasana  | Uttāna Kūrmāsana | 26               |
| dhanurasana       | Dhanurāsana      | 27               |
| matsyendrasana    | Matsyendrāsana   | 28–29            |
| paschimottanasana | Paścimottānāsana | 30–31            |
| mayurasana        | Mayūrāsana       | 32–33            |
| shavasana         | Śavāsana         | 34               |
| siddhasana        | Siddhāsana       | 37–45            |
| padmasana         | Padmāsana        | 46–51            |
| simhasana         | Siṃhāsana        | 52–54            |
| bhadrasana        | Bhadrāsana       | 55–56            |

Gheranda Samhita, Shiva Samhita and Sritattvanidhi are deferred. Yoga Makaranda and Light on Yoga are reserved for a separately labelled `transitional` tier. No entries from those tiers are included. Modern arm binds, kneeling Virasana and modern prone Dhanurasana are not silently substituted for ambiguous historical descriptions.

## Architecture and performance

- Vite + React **18**, TypeScript, Fiber **8**, Drei **9**, Three.js, Zustand, Tailwind and Zod. React/Fiber major versions are intentionally paired.
- `src/core/rig.ts`: original MIT-licensed humanoid, actual `SkinnedMesh`, 22 bones, procedural low-detail geometry. No externally licensed character or premade animation is downloaded.
- Shared geometry/material are generated once; independent visible poses require independent skeleton/mesh objects. Sharing the same scene object across two parents would break comparison. Skeleton textures are disposed on unmount.
- Atlas thumbnails use one WebGL canvas with scissored views. One reusable skinned mannequin renders each pose **once into a cached GPU render target** at its current viewport size. Scrolling draws the cached textures rather than rerendering the rig. Pose/size changes regenerate a target, and canvas unmount disposes the cache. The result is derived from the actual pose JSON; there are no bitmap thumbnail files, image downloads or continuous thumbnail animations.
- Studio and viewer code load by route; the rig is constructed only when a 3D view mounts. Pixel ratio is capped at 1.3 for thumbnails and 1.5 for viewers. No live shadows or postprocessing. The core 3D vendor bundle is about 233 KB gzip, with a Vite large-chunk advisory.
- **60 fps is a target, not a measured guarantee.** A physical mid-range phone benchmark remains outstanding. See `VERIFICATION.md` for what was actually checked.

The mannequin is intentionally schematic: the Human style has simple fingers and facial details, but neither style simulates soft tissue, balance, grip forces or joint limits. Offline torso/head clearance correction is applied to shipped poses; it is not a full collision or safety simulation. Some foot/hand contacts and historical configurations remain approximate. In particular, Simhasana's facial/finger detail is documented but not animated. The UI exposes these limits rather than claiming anatomical or historical precision.

`scripts/author-seeds.ts` records the reproducible initial authoring of the fifteen flows. It is **not** part of the build and should not be run over manually edited records unless you intend to regenerate them. The shipped per-asana JSON is the runtime source of truth.

## Static deployment

There is no backend or environment secret.

- **Vercel:** import this repository, use `npm run build`, publish `dist`. `vercel.json` uses the [documented SPA rewrite](https://vercel.com/docs/frameworks/frontend/vite) to preserve deep links.
- **Netlify:** import this repository; `netlify.toml` sets the build/publish directories and [SPA fallback](https://docs.netlify.com/resources/troubleshooting/page-not-found-error-guide/). `public/_redirects` also ships in `dist`.
- **Other hosts:** serve `dist` and rewrite non-asset, unknown paths to `index.html`. Cache hashed `/assets/*` files; revalidate `index.html` so new deployments do not request removed chunks.

No deployment is performed by this repository. Source validation runs before every `npm run build` and in the GitHub Actions workflow.

## Licensing

Application code and the original rig: MIT. The supplied book’s pictures and Russian text are excluded from that license; existing attribution and watermarks are preserved. Source and dependency notices are in `LICENSES.md`. The digital edition describes the 1914 translation as public domain in the United States. All seed animation data is original and distributed with this project.

## Updated movement review

See [MOVEMENT_REVIEW.md](MOVEMENT_REVIEW.md) for the fifteen-pose review, corrected movement paths, geometry/contact tests and remaining interpretation limits. The viewer now has left/right limb colors, visible joints, contrasting palms/soles, a labelled X-ray overlay and an enlarged view.

Use the **Model** selector on the atlas or in any 3D viewer to switch between **Reference** and **Human**. Human uses a connected skinned body, skin tones, clothing, facial features, fingers and toes. The choice persists on this device and applies to thumbnails, comparison and the studio. Both appearances share the same skeleton and movement data; X-ray guides remain available in either mode.

Shipped movements now use torso/head clearance checks and corrected elbow/knee routes. Obstructed transitions include an optional `path` of uniformly spaced poses, sampled with the frame's interpolation mode after easing. The editor discards a route when either neighboring endpoint changes. These precomputed routes are original reconstructions; they are not a general collision solver for arbitrary studio edits or sequence bridges.

Keyframes may specify `interpolation: "limb"` for world-space wrist/ankle paths or `"joint"` for quaternion interpolation. Omitted values preserve legacy joint interpolation. The shipped hand balances use planted wrist targets; the bound recline uses joint interpolation to preserve its leg fold. The updated mannequin uses 0.32 m upper arms and 0.30 m forearms. Previously saved studio drafts retain their rotations and should be reviewed against these updated proportions; reload a shipped asana to start from the reviewed poses.
