# Blender render audit — 9 September 2026

This audit uses Blender 4.5.13 LTS, EEVEE, 24 samples and three orthographic views per mesh. The published report covers the 108 Brahmachari studies in both Human and Reference appearances: 216 posed meshes and 648 renders. The retired HYP collection has been removed from the public report. The [browsable report](https://classical-yoga-atlas.toebu-jenni.workers.dev/audits/blender/) contains every render and the corresponding book picture where one exists.

## Findings

Successful rendering does not establish that a yoga posture is correct. The earlier four-item limitation list was incomplete. This pass records 30 book studies with specific source or surface findings in `scripts/book/blender-review.json`; those notices also appear on the posture pages and in the “Models need refinement” filter.

- The Human mesh has open/pointed surface seams around the pelvis and thighs in deep folds, and pinched surfaces at sharply bent elbows and knees. The Reference appearance is composed of separate rigid shapes and does not have the same continuous-surface deformation.
- Several source contacts are missing. Baddha Padmāsana does not reproduce the rear arm bind; Ākarṇa Dhanurāsana's forward hand stops short of the foot; Ardha Ūrdhvāsana's overhead hand misses the raised rear foot.
- Some configurations still differ substantially from the source. Karṇa Pīḍāsana has a low torso instead of the photographed raised-pelvis knee-to-ear fold. Śīrṣacakrāsana is too wheel-like. Garbhāsana does not thread the forearms through the folded legs.
- Lighting differs between Blender and the browser. These are independent geometric render checks, not pixel-identical browser screenshots or anatomical certification.

The audit does not modify bone rotations, body proportions, model topology or animation data. It updates the review notices, adds reproducible Blender tooling and publishes the evidence. The source pose data was compared with the previous commit and confirmed unchanged.

All 216 book meshes had finite vertices and normals, no newly collapsed triangles, and no structural changes requested by Blender validation. The lowest vertex stayed at least 2 mm above the floor. All 64 application tests passed after rendering completed. These checks did not catch the visible seams and incorrect grips; the picture comparison remains essential.

## Method and diagnostic limits

The exporter evaluates the same Three.js `SkinnedMesh` used by the application. It writes the final deformed vertices, indices, linear vertex colors and skin-shader normals. Each mesh has a SHA-256 hash recorded in the report. Blender imports those values without remeshing, pose correction or automatic repair. Coordinates transform from Three.js `(x,y,z)` to Blender `(x,-z,y)`; units remain metres. The floor is zero.

Blender renders front, side and rear three-quarter views at 420 × 420 pixels, with backface culling enabled. Camera bounds are fitted per view and checked with Blender's camera projection. An early audit-camera cropping problem was fixed before the completed batch was generated. The final PNGs were reviewed in source-comparison sheets, then converted to WebP for the online report.

Diagnostics check finite vertices/normals, floor clearance, newly collapsed triangles and whether Blender's structural mesh validation would change a copy. The original geometry is always the rendered geometry. Counts of opposing geometric and shaded normals are retained as review cues: these can be internal faces at folded joints, and are not a count of visible holes. Structural validity does not imply a closed surface, absence of self-intersection, correct support contact or correct anatomical joint limits.

Book sequences display these static poses with timed holds and direct changes. They do not generate or certify movements between postures. Sūrya Namaskāra has source pictures but no separate 3D model and is not counted as a rendered mesh.

## Reproduce

Requires Node 22.18+, Blender 4.5+, and a separate Python with NumPy/Pillow for the sheets and report. Blender's bundled Python runs the rendering script.

```sh
npm ci
npm run audit:meshes -- /absolute/audit/human human
npm run audit:meshes -- /absolute/audit/reference reference

blender -b --factory-startup --python scripts/blender-audit.py -- /absolute/audit/human
blender -b --factory-startup --python scripts/blender-audit.py -- /absolute/audit/reference

python scripts/blender-contact-sheets.py /absolute/audit/human
python scripts/blender-contact-sheets.py /absolute/audit/reference
python scripts/publish-blender-audit.py /absolute/audit
npm test
npm run build
```

The renderer accepts an optional comma-separated order list for focused rerenders. It saves editable `.blend` examples for orders 8, 47 and 94 when present. The publication script refuses incomplete batches, missing images, mesh hash mismatches or entries without a recorded visual review. A future pose edit requires a new export, render and visual review; existing renders are a dated snapshot.

Blender download and command-line references: [official LTS distribution](https://download.blender.org/release/Blender4.5/) and [background rendering manual](https://docs.blender.org/manual/en/latest/advanced/command_line/render.html).
