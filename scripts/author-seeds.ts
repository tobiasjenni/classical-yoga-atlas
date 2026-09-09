import { writeFileSync } from 'node:fs';
import { asanaSchema, type Asana } from '../src/core/schema.ts';
import type { BoneName } from '../src/core/bones.ts';
import { authoredFlow } from './seed-poses.ts';
import { planClearance } from './plan-clearance.ts';

type Seed = {
  id: string;
  sanskrit: string;
  iast: string;
  english: string;
  verse: string;
  family: Asana['family'];
  difficulty: Asana['difficulty'];
  description: string;
  note?: string;
  instruction: string;
  joints: BoneName[];
  related: string[];
};
const seeds: Seed[] = [
  {
    id: 'svastikasana',
    sanskrit: 'स्वस्तिकासन',
    iast: 'Svastikāsana',
    english: 'Auspicious seat',
    verse: '21',
    family: 'meditative',
    difficulty: 2,
    description: 'An upright, interlaced seat.',
    note: 'The digital English translation says hands where its Sanskrit has pāda (feet); the exact placement remains unverified.',
    instruction: 'Observe the upright trunk and interlaced legs in this proposed reconstruction.',
    joints: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg'],
    related: ['siddhasana', 'padmasana'],
  },
  {
    id: 'gomukhasana',
    sanskrit: 'गोमुखासन',
    iast: 'Gomukhāsana',
    english: 'Cow-face posture',
    verse: '22',
    family: 'seated',
    difficulty: 3,
    description: 'A seat with ankles on opposite sides.',
    note: 'The familiar modern overhead arm bind is not specified in this verse. The model uses a neutral hand placement.',
    instruction: 'Observe the crossed leg arrangement; the hand placement is editorial.',
    joints: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg', 'mixamorigLeftLeg', 'mixamorigRightLeg'],
    related: ['virasana', 'svastikasana'],
  },
  {
    id: 'virasana',
    sanskrit: 'वीरासन',
    iast: 'Vīrāsana',
    english: 'Hero’s seat',
    verse: '23',
    family: 'seated',
    difficulty: 3,
    description: 'A seat with a foot upon a thigh.',
    note: 'The wording and English translation leave the second leg arrangement uncertain. This proposed crossed-leg model is unverified; it is not modern kneeling Virasana.',
    instruction:
      'Observe the proposed foot-on-thigh seat; the second leg arrangement is uncertain.',
    joints: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg'],
    related: ['padmasana', 'gomukhasana'],
  },
  {
    id: 'kurmasana',
    sanskrit: 'कूर्मासन',
    iast: 'Kūrmāsana',
    english: 'Tortoise seat',
    verse: '24',
    family: 'seated',
    difficulty: 3,
    description: 'A compact seat with crossed ankles.',
    note: 'This is a crossed-ankle seat in the cited passage, not the modern wide-legged forward fold.',
    instruction: 'Observe the compact crossed-ankle seat described by this interpretation.',
    joints: [
      'mixamorigLeftUpLeg',
      'mixamorigRightUpLeg',
      'mixamorigLeftFoot',
      'mixamorigRightFoot',
    ],
    related: ['simhasana', 'uttana-kurmasana'],
  },
  {
    id: 'kukkutasana',
    sanskrit: 'कुक्कुटासन',
    iast: 'Kukkuṭāsana',
    english: 'Cockerel balance',
    verse: '25',
    family: 'balance',
    difficulty: 5,
    description: 'A lotus-based balance supported on the hands.',
    note: 'Palm orientation and the lifted body have been checked. Arm threading and soft-tissue contact remain schematic rather than a collision simulation.',
    instruction: 'Observe the proposed hand support beneath the folded legs.',
    joints: ['mixamorigLeftHand', 'mixamorigRightHand', 'mixamorigLeftArm', 'mixamorigRightArm'],
    related: ['padmasana', 'uttana-kurmasana'],
  },
  {
    id: 'uttana-kurmasana',
    sanskrit: 'उत्तानकूर्मासन',
    iast: 'Uttāna Kūrmāsana',
    english: 'Upturned tortoise',
    verse: '26',
    family: 'supine',
    difficulty: 5,
    description: 'A reclined folded posture with arms at the neck.',
    note: 'The model shows crossed hands behind the neck and a reclined lotus shape. The detailed arm route through the bound legs remains schematic.',
    instruction: 'Observe the reclined folded legs and arms directed toward the neck.',
    joints: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg', 'mixamorigLeftArm', 'mixamorigRightArm'],
    related: ['kukkutasana', 'kurmasana'],
  },
  {
    id: 'dhanurasana',
    sanskrit: 'धनुरासन',
    iast: 'Dhanurāsana',
    english: 'Drawn-bow posture',
    verse: '27',
    family: 'seated',
    difficulty: 5,
    description: 'A toe-to-ear, bow-drawing description.',
    note: 'The terse passage does not unambiguously determine a full 3D shape. This seated archer interpretation is unverified; no modern prone bow is silently substituted.',
    instruction:
      'Observe a proposed bow-drawing shape; the source’s exact configuration is uncertain.',
    joints: ['mixamorigRightUpLeg', 'mixamorigRightLeg', 'mixamorigRightArm'],
    related: ['paschimottanasana', 'matsyendrasana'],
  },
  {
    id: 'matsyendrasana',
    sanskrit: 'मत्स्येन्द्रासन',
    iast: 'Matsyendrāsana',
    english: 'Matsyendra’s posture',
    verse: '28–29',
    family: 'seated',
    difficulty: 4,
    description: 'A turned posture attributed to Matsyendra.',
    note: 'The digital heading says Matsya-asana; the Sanskrit identifies Matsyendra’s seat. The translation and Sanskrit limb descriptions diverge, so the bind is unverified.',
    instruction:
      'Observe the turned trunk and proposed leg arrangement; the precise bind is uncertain.',
    joints: ['mixamorigSpine', 'mixamorigSpine1', 'mixamorigLeftUpLeg'],
    related: ['paschimottanasana', 'padmasana'],
  },
  {
    id: 'paschimottanasana',
    sanskrit: 'पश्चिमोत्तानासन',
    iast: 'Paścimottānāsana',
    english: 'Westward extension',
    verse: '30–31',
    family: 'seated',
    difficulty: 3,
    description: 'An extended-leg fold reaching toward the feet.',
    note: 'Straight legs, fixed heels and hand reach have been checked. The depth of the fold and exact forehead-to-knee contact remain schematic.',
    instruction: 'Observe the extended legs and trunk folding toward them.',
    joints: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg', 'mixamorigSpine'],
    related: ['dhanurasana', 'matsyendrasana'],
  },
  {
    id: 'mayurasana',
    sanskrit: 'मयूरासन',
    iast: 'Mayūrāsana',
    english: 'Peacock balance',
    verse: '32–33',
    family: 'balance',
    difficulty: 5,
    description: 'A horizontal balance with elbows beneath the abdomen.',
    instruction:
      'Observe the horizontal body and proposed elbow support; this model is not a balance simulation.',
    joints: [
      'mixamorigLeftHand',
      'mixamorigRightHand',
      'mixamorigLeftForeArm',
      'mixamorigRightForeArm',
    ],
    related: ['kukkutasana', 'shavasana'],
  },
  {
    id: 'shavasana',
    sanskrit: 'शवासन',
    iast: 'Śavāsana',
    english: 'Corpse posture',
    verse: '34',
    family: 'supine',
    difficulty: 1,
    description: 'A still, face-up resting posture.',
    instruction: 'Observe the still supine shape. Limb spacing and hold time are editorial.',
    joints: [],
    related: ['uttana-kurmasana'],
  },
  {
    id: 'siddhasana',
    sanskrit: 'सिद्धासन',
    iast: 'Siddhāsana',
    english: 'Accomplished seat',
    verse: '37–45',
    family: 'meditative',
    difficulty: 3,
    description: 'A heel-based seat with a lowered chin.',
    instruction: 'Observe the proposed heel arrangement and lowered chin.',
    joints: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg', 'mixamorigNeck'],
    related: ['svastikasana', 'padmasana'],
  },
  {
    id: 'padmasana',
    sanskrit: 'पद्मासन',
    iast: 'Padmāsana',
    english: 'Lotus posture',
    verse: '46–51',
    family: 'meditative',
    difficulty: 4,
    description: 'A seat with feet resting on opposite thighs.',
    note: 'The model follows the open-hand variant at 1.47–48. The bound-hand variant at 1.46 is a distinct description.',
    instruction: 'Observe the proposed open-hand lotus variant and lowered chin.',
    joints: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg', 'mixamorigLeftLeg', 'mixamorigRightLeg'],
    related: ['siddhasana', 'kukkutasana', 'bhadrasana'],
  },
  {
    id: 'simhasana',
    sanskrit: 'सिंहासन',
    iast: 'Siṃhāsana',
    english: 'Lion’s posture',
    verse: '52–54',
    family: 'seated',
    difficulty: 3,
    description: 'A crossed-heel seat with hands at the knees.',
    note: 'The hands now show separate extended fingers. Finger spreading and the open mouth in 1.53 still lack independent articulation and are not fully represented.',
    instruction:
      'Observe the crossed-heel seat and hands at the knees. The open mouth and articulated finger spread remain unmodeled.',
    joints: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg'],
    related: ['kurmasana', 'bhadrasana'],
  },
  {
    id: 'bhadrasana',
    sanskrit: 'भद्रासन',
    iast: 'Bhadrāsana',
    english: 'Gracious seat',
    verse: '55–56',
    family: 'meditative',
    difficulty: 2,
    description: 'A steady seat with the feet held together.',
    instruction: 'Observe the joined feet, open knees and hands directed toward the feet.',
    joints: ['mixamorigLeftUpLeg', 'mixamorigRightUpLeg'],
    related: ['padmasana', 'simhasana'],
  },
];
for (const seed of seeds) {
  const keyframes = planClearance(authoredFlow(seed.id, seed.instruction, seed.joints));
  const claims: string[] = [];
  if (seed.id === 'shavasana')
    claims.push(
      'The text says “gives rest to the mind” (HYP 1.34, Sinh 1914). Historical claim, not a clinical finding.',
    );
  if (seed.id === 'siddhasana')
    claims.push(
      'The text calls it the “opener of the door of salvation” (HYP 1.37, Sinh 1914). This is a spiritual claim.',
    );
  if (seed.id === 'simhasana')
    claims.push(
      'The text claims “completion of the three Bandhas” (HYP 1.54, Sinh 1914). This is a traditional claim.',
    );
  const a: Asana = {
    schemaVersion: 1,
    id: seed.id,
    sanskrit: seed.sanskrit,
    iast: seed.iast,
    translit: seed.id.replaceAll('-', ' '),
    english: seed.english,
    aliases:
      seed.id === 'shavasana'
        ? ['Savasana', 'Shava-asana']
        : seed.id === 'paschimottanasana'
          ? ['Paschima Tana', 'Pashchimottanasana']
          : [],
    source: [
      {
        text: 'Hatha Yoga Pradipika',
        chapter: '1',
        verse: seed.verse,
        edition: 'Pancham Sinh, Panini Office, Allahabad, 1914; Sacred Texts digital edition',
        url: 'https://sacred-texts.com/hin/hyp/hyp03.htm',
        provenance: 'attested',
      },
    ],
    provenance: 'attested',
    tier: 'classical',
    family: seed.family,
    difficulty: seed.difficulty,
    description: seed.description,
    traditionalClaims: claims,
    modernNotes: [
      'The figure is a schematic reconstruction, not an anatomical simulation. Exact joint angles, contact, entry/exit movements, timing and difficulty have not been historically or clinically verified.',
    ],
    contraindications: [],
    breath:
      'No verified phase-by-phase breathing prescription is encoded. “Free” is an editorial display marker.',
    relatedAsanas: seed.related,
    counterpose: [],
    keyframes,
    interpretationNotes: seed.note ? [seed.note] : [],
    fieldProvenance: {
      movement: 'unverified',
      difficulty: 'unverified',
      anatomy: 'unverified',
      contraindications: 'unverified',
      breath: 'unverified',
      drishti: ['siddhasana', 'padmasana', 'simhasana'].includes(seed.id)
        ? 'attested'
        : 'unverified',
    },
  };
  if (seed.id === 'siddhasana') a.drishti = 'Between the eyebrows — HYP 1.37 (Sinh 1914).';
  if (seed.id === 'padmasana') a.drishti = 'Tip of the nose — HYP 1.46, 1.48 (Sinh 1914).';
  if (seed.id === 'simhasana') a.drishti = 'Tip of the nose — HYP 1.53 (Sinh 1914).';
  writeFileSync(
    new URL(`../tests/fixtures/retired-hyp/${seed.id}.json`, import.meta.url),
    JSON.stringify(asanaSchema.parse(a), null, 2) + '\n',
  );
}
console.log(`Authored ${seeds.length} source-linked records with staged limb movement.`);
