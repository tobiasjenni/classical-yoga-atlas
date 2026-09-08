# Verification — updated 8 September 2026

## Book expansion

The main atlas now contains the complete Brahmachari book inventory. Seven book tests cover source/model membership, both full mesh styles against the floor, torso/head clearance and distinctive book forms. The 108 models are static reconstructions; no book entry/exit animation or clinical accuracy is certified. See [BRAHMACHARI_REVIEW.md](BRAHMACHARI_REVIEW.md).

## Automated checks completed locally

`npm test`: **40 tests passed** across five files. See [MOVEMENT_REVIEW.md](MOVEMENT_REVIEW.md) for the additional all-pose geometry and contact checks.

- Torso/head clearance at 0.025-second intervals across all fifteen flows, including mirrored poses; a deliberately penetrating arm verifies that the detector catches collisions.
- Every vertex in both Reference and Human meshes checked against the floor at 0.1-second intervals.
- Precomputed routes with edited or mismatched endpoints are rejected by schema validation.

- Shortest-arc quaternion slerp and normalized rotations.
- Static hold and return to neutral.
- Mirroring twice restores the original pose, including root orientation.
- Reachable analytical two-bone IK solves within 1 mm without changing limb lengths.
- Unreachable IK targets remain finite and schema-valid.
- Invalid quaternions and incomplete bone maps are rejected.
- Missing citation locations cannot be marked attested.
- The secondary HYP corpus contains exactly the fifteen agreed seed IDs.
- All 15 flows are sampled at quarter-second intervals; all bone rotations remain normalized and root positions finite.
- Empty/out-of-order flows, moving holds and discontinuous neutral endpoints are rejected.
- Every seed separates attested occurrence from unverified movement.

`npm run build`: **passed**. Validated 108 book models, 109 book sections, all Sanskrit/English names and 185 original image hashes, plus 15 HYP records and their staged keyframes and all cross-references before TypeScript checking and Vite compilation. The production `dist` is included in the separate site archive.

`npm run format:check`: **passed** before packaging.

GitHub Actions is configured for clean installation, validation, tests and build. The remote workflow has **not** been run: no remote repository or deployment was created.

## Full application audit

The subsequent [audit](AUDIT.md) covers all 108 route renders, all nine catalogue pages, 320/390/768/1440-pixel responsive checks, gallery and modal focus, dependency security and byte-for-byte EPUB verification. Ten discovery tests cover pagination, multilingual queries and combined filters. The latest book tests also check finite mesh vertices and the corrected standing stance, grounded overhead fold and distinct seated balances.

## Earlier book browser checks completed

- Main collection, Sanskrit/English/Russian labels, default 3D cards and Book pictures toggle inspected.
- ASCII `vrksa` and Devanagari `वृक्ष` each locate the book’s handstand with the inversion filter active.
- Human side-view studies of Vīrāsana, Dhanurāsana, Uṣṭrāsana and Bhadrāsana compared with their primary pictures; Vṛkṣāsana reviewed in three-quarter view. The lunge arm direction, stance, overhead fold and handstand arm extension were refined during this pass. This is a representative visual review, not full anatomical certification of 108 poses.
- Picture next/previous, enlarged dialog, return to the model’s source image and original Russian-text loading verified.
- Mobile 390 × 844: search/filter layout, picture gallery, Reference/Human selection and X-ray controls inspected. No horizontal overflow in the inspected index or browser console errors during the checks.
- Sūrya Namaskāra shows twelve source pictures and explicitly states that its 3D sequence has not been reconstructed.

## Earlier HYP browser checks completed

Production preview served at `http://127.0.0.1:5173`, inspected through the Codex browser with its default desktop viewport and a 390 × 844 phone viewport.

- Atlas and live-generated/cached pose thumbnails render; cached images remain correct on scroll.
- Reference/Human switching updates the atlas and detail viewer; the choice persists across navigation. Human lotus and the revised bound recline were inspected enlarged. The mobile Model selector and X-ray guides fit at 390 × 844; no browser errors were reported during these checks.
- ASCII search for `padmasana` finds the IAST entry; Devanagari `शव` finds Śavāsana.
- A nonexistent query shows the empty state; reset restores the collection.
- Balance-family filtering returns two entries.
- Detail pages expose the edition, chapter/verse link, provenance notes and separate historical/editorial panels.
- Play/pause updates elapsed time; 2× speed selection works; direct keyframe selection enters static stepping.
- Anatomy toggle displays author-selected joint markers.
- Studio numeric FK edit, mirroring, undo and validated JSON export work.
- Dragging a hand IK arrow visibly bends the arm. A fresh check after attaching the IK helper to the scene reports no console errors.
- Editing the final pose propagates to the hold; reloading the studio restores the edited values.
- Importing a shipped asana JSON loads its record and re-exports successfully.
- Comparison creates two canvases; changing the right posture changes its model while shared stepping displays both targets.
- Sequence add/reorder, JSON export and persistence after reload work.
- Mobile navigation and dark theme work. The atlas and comparison page had no horizontal overflow at the tested phone viewport.
- A mobile hero-caption overlap found during review was corrected. Hidden mobile navigation is removed from visibility and keyboard focus until opened.

## Scope of these results

- Browser checks were exercised through UI automation; they are not a committed Playwright end-to-end suite.
- The static-step fallback was exercised. OS-level reduced-motion preference switching was not separately emulated in the browser; the media-query hook is implemented.
- No physical phone, touch hardware, screen reader, formal WCAG audit, WebGL-loss simulation or 60 fps benchmark was used. These remain release-hardening checks.
- Build emits a large-chunk advisory for the 3D vendor chunk (about 235 KB gzip) and the deferred HYP data chunk (about 173 KB gzip). The main entry chunk is now about 5.7 KB gzip. The advisory is not a failed build.
- Development-server dependency optimization encountered a Windows sandbox ancestor-directory access restriction. Production compilation and preview succeeded; browser checks used the production preview.
- Verse locations were checked against the linked 1914 digital edition. Exact anatomical configurations, contact, dynamic balance and reconstructed movement have not been certified by a Sanskrit scholar, movement specialist or clinician. They remain visibly **unverified**.
- No deployment, GitHub push, backend, account, telemetry or external asset upload was performed.
