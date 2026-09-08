# Movement and model review — 8 September 2026

All fifteen shipped poses were compared with the cited passages and inspected from front and side in the browser. Reconstructed entry and exit movements were reauthored and sampled by automated tests. This is an engineering and source comparison, not certification by a yoga teacher, anatomist or Sanskrit scholar.

## What changed

- Slimmer upper/lower limbs, dark joint landmarks, separate fingers and thumbs, visible soles and contrasting palm surfaces. Teal denotes the model's left, ochre its right.
- A labelled limb X-ray reveals occluded wrist/ankle positions. Enlarged viewing and cameras fitted to the movement help inspect small details.
- Seated entries place one leg at a time, then the hands, then the trunk. Lifted waypoints replace the old whole-body fractional poses. Exits reverse the authored stages.
- Hand balances and reclined poses have their own supported starting arrangements. The peacock lifts its feet before extending the ankles; the upturned tortoise preserves its folded leg shape while reclining.
- World-space endpoint interpolation holds planted wrists/heels in place. A floor constraint on the knee bend circle prevents below-ground knees without stretching bones. Pelvic rotation follows the hip joints during the forward fold.

## Pose-by-pose review

Verse numbering follows [Pancham Sinh's 1914 digital edition, chapter I](https://sacred-texts.com/hin/hyp/hyp03.htm). The short criteria below identify what was compared, not prescribed practice instructions.

| Asana            | Verse | Shape criterion                         | Correction / remaining interpretation                                                                                           |
| ---------------- | ----- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Svastikāsana     | 21    | Upright, interlaced seat                | Separate leg placement; feet no longer point vertically. Digital English “hands” conflicts with Sanskrit feet.                  |
| Gomukhāsana      | 22    | Ankles on opposite sides                | Reviewed crossed leg arrangement; no unsupported modern overhead arm bind added.                                                |
| Vīrāsana         | 23    | Foot upon a thigh                       | Clearer folded legs and soles. Second-leg interpretation remains uncertain.                                                     |
| Kūrmāsana        | 24    | Crossed ankles, compact seat            | Corrected downward/backward knee poles and foot direction.                                                                      |
| Kukkuṭāsana      | 25    | Lotus, palms supporting a lift          | Wider knee space, palms down, wrists remain planted during lift. Threaded contact is schematic.                                 |
| Uttāna Kūrmāsana | 26    | Reclined fold, hands behind neck        | Crossed wrists; folded legs rotate together. Exact threaded arm route is schematic.                                             |
| Dhanurāsana      | 27    | Bow drawing, toes toward ears           | Corrected previously unreachable hand-to-foot target and raised-foot alignment. Seated archer interpretation remains uncertain. |
| Matsyendrāsana   | 28–29 | Turned trunk, crossed foot placement    | Leg arrangement precedes spinal turn; corrected hand reach. Precise bind remains uncertain.                                     |
| Paścimottānāsana | 30–31 | Straight legs, toe grasp, deep fold     | Knees remain extended and heels fixed; corrected hand orientation. Exact forehead contact remains schematic.                    |
| Mayūrāsana       | 32–33 | Horizontal body, elbows beneath abdomen | Lowered support geometry; palms down, feet lift before pointing backward. No dynamic balance simulation.                        |
| Śavāsana         | 34    | Face-up rest                            | Supported recline, separated limbs and upward palms. Spacing and timing are editorial.                                          |
| Siddhāsana       | 37–45 | Heel arrangement, lowered chin          | Corrected knee clearance and foot direction; staged placement.                                                                  |
| Padmāsana        | 46–51 | Feet on thighs, soles/palms up          | Open-hand variant at 47–48; widened knees, corrected world orientations and hand placement.                                     |
| Siṃhāsana        | 52–54 | Crossed heels, hands at knees           | Corrected knees/feet; individual fingers visible. Open mouth and articulated finger spreading remain unmodeled.                 |
| Bhadrāsana       | 55–56 | Joined feet held by hands               | Soles face each other, knees open, hand placement follows leg placement.                                                        |

## Verification

`npm test`: 23 tests pass, including these checks:

- Every vertex of both Reference and Human meshes stays above the floor (2 mm numerical allowance) at all authored poses and at 0.1-second samples throughout all fifteen flows.
- Limb volumes stay outside the torso/head envelopes at 0.025-second samples, including mirrored playback (1 mm numerical allowance). The proximal thigh attachment is exempt from the pelvis/lower spine envelopes; hands, feet and distal limbs are not exempt. A deliberately penetrating arm tests the detector itself.
- Bone lengths remain fixed; wrist/knee displacement stays below 8 cm between 0.05-second samples. This detects sudden flips, not clinical range-of-motion violations.
- Both wrists remain within 2 mm of their planted positions during the cockerel lift.
- Forward-fold heels stay within 2 mm of their starting positions and knee flexion stays below 5° throughout playback.
- Lotus soles and palms face upward; both balance poses' palms face downward.
- The opposite leg stays still while the first leg is placed.

Browser review covers final front/side views for all fifteen records, additional top views for lotus/balances, the enlarged viewer, X-ray guides and playback controls. See `VERIFICATION.md` for the broader application checks.

Reference and Human are two appearances of the same skeleton. The new Human mesh has blended skin weights, clothing, facial features and individual fingers/toes. Torso/head envelopes are an approximation: these tests do not establish physiological joint limits, full soft-tissue or limb-to-limb collision simulation, grip mechanics, balance, breath prescriptions or the historical correctness of an entry/exit sequence. The app retains the movement's **unverified reconstruction** status and exposes unresolved details beside the affected entries.

The September 8 collision update repositions obstructed elbow/knee planes and routes moving endpoints around the body. The behind-the-neck fold now opens the arms outward first and retains its bound arm shape while reclining. The forward fold adjusts neck position so the head clears the toes without sliding the heels. Corrected routes are stored with the affected transitions and validated against both endpoints; studio endpoint edits discard stale routes. User-authored flows and sequence bridges are not automatically collision-corrected.

## Reproduce

```sh
node --experimental-strip-types scripts/author-seeds.ts
npm run format
npm test
npm run build
node --experimental-strip-types scripts/audit-motion.ts
node --experimental-strip-types scripts/audit-body.ts
```

The final command prints a compact diagnostic table at 0.25-second intervals. Supply an output filename as its argument for detailed JSON. The stronger all-vertex 0.1-second check is in the tests. Seed regeneration overwrites the shipped records; edit `scripts/seed-poses.ts` for reproducible pose/flow changes and `scripts/author-seeds.ts` for source metadata.
