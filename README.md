# Classical Yoga Atlas

[Open the atlas](https://classical-yoga-atlas.toebu-jenni.workers.dev/) · [Build a book sequence](https://classical-yoga-atlas.toebu-jenni.workers.dev/sequence)

The atlas focuses exclusively on Dhirendra Brahmachari’s **108 asanas in Yogāsana Vijñāna**, using the supplied Russian EPUB. Every posture has Sanskrit in Devanagari and IAST, an English label, original pictures, its Russian source section, and a static 3D study. The book’s twelve illustrated Sūrya Namaskāra stages remain a separate picture section.

The 15 HYP models and their comparison views are retired from the application. Old HYP routes return to the book atlas. Historical source fixtures in `tests/fixtures/retired-hyp` and dated audit documents remain in the repository for provenance and regression testing; they are not a published collection or a sequence source.

## Run and verify

Requires Node 22.18+ and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview -- --port 5173
```

## Book sequences

Select any of the 108 book asanas, or add all 108 in source order. Repeated poses are allowed, up to 216 entries. Each occurrence has its own hold time from 1 to 600 seconds. Reorder by dragging or with the arrow buttons, remove individual entries, or clear the sequence with an undo option.

The player holds the exact authored pose, then switches directly to the next pose. It includes the source picture, Human/Reference appearances, orbit controls, pause, replay, loop, previous/next, timeline seeking, and a step selector. It pauses when the tab becomes hidden. There is no interpolation or claimed entry/exit movement between book postures.

Drafts save locally under `atlas-book-sequence-v2`. Export/import uses schema version 2, kind `book-reference-sequence`, and source `brahmachari-yogasana-vijnana`, with ordered `{id, holdSeconds}` items. Unknown poses, invalid hold times, oversized lists, and legacy HYP sequences are rejected without replacing the current sequence. Old HYP drafts are left in their separate storage key because matching names may describe different configurations.

## Routes

| Route                 | Purpose                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `/` or `/brahmachari` | Search and filter the 108 book asanas, with pictures or 3D previews                         |
| `/brahmachari/:id`    | Book pictures, Sanskrit/English names, model, source text and Add to book sequence          |
| `/sequence`           | Arrange and preview book poses with timed holds; save/import/export                         |
| `/studio`             | Author local drafts starting from the 108 book poses, with FK/IK, undo/redo and JSON export |
| `/sources`            | Book attribution, edition details and interpretation limits                                 |
| `/audits/blender/`    | All 108 models in two appearances and three views: 648 Blender renders                      |

The studio starts from static book targets. Edits are local drafts and do not change the published collection or sequence models. The book sequence player always reads the original authored book pose data.

## Model accuracy

The [Blender audit](docs/blender-audit.md) records specific remaining visual findings for 30 book studies, including missing grips, different limb placements, and Human surface seams at deeply folded joints. Successful rendering is not proof of pose accuracy. The sequence feature does not repair these existing defects. Models and editorial timing are study aids, not practice instructions or anatomical certification.

Reproducible exporter, renderer, comparison-sheet and report scripts are in `scripts/`. Poses use metres, +Y up, +Z forward, and local normalized quaternion rotations on the documented mannequin bones. Mesh exports preserve the website’s actual posed vertices and normals.

## Publish

The site uses Cloudflare Workers static assets with SPA routing. Authenticate with Wrangler and run `npm run deploy`. Configuration is in `wrangler.jsonc`; no credentials belong in the repository. GitHub CI validates data, runs tests and builds on each push; deployment is separate.

```sh
npm run verify:site -- https://classical-yoga-atlas.toebu-jenni.workers.dev
```

This verifies all 185 original picture hashes and six application routes. The full book inventory, names, models and EPUB provenance are checked by `npm run validate`. The supplied book remains the primary source; English labels and normalized Sanskrit spellings are editorial.
