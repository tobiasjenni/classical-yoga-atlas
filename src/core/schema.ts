import { z } from 'zod';
import { boneNames } from './bones.ts';
export const vectorSchema = z.tuple([
  z.number().finite(),
  z.number().finite(),
  z.number().finite(),
]);
export const quaternionSchema = z
  .tuple([z.number().finite(), z.number().finite(), z.number().finite(), z.number().finite()])
  .refine((q) => Math.abs(Math.hypot(...q) - 1) < 0.001, 'Quaternion must have unit length');
export const poseSchema = z
  .object({
    bones: z.record(z.enum(boneNames), quaternionSchema).superRefine((bones, ctx) => {
      for (const bone of boneNames)
        if (!bones[bone]) ctx.addIssue({ code: 'custom', message: `Missing bone ${bone}` });
    }),
    root: z.object({ position: vectorSchema, rotation: quaternionSchema }).strict(),
  })
  .strict();
export const phases = ['neutral', 'prep', 'transition', 'final', 'hold', 'exit'] as const;
export const keyframeSchema = z
  .object({
    id: z.string().min(1),
    phase: z.enum(phases),
    duration: z.number().finite().min(0.1).max(120),
    breath: z.enum(['inhale', 'exhale', 'retain', 'free']).optional(),
    instruction: z.string().min(1),
    easing: z.enum(['linear', 'easeInOut', 'easeIn', 'easeOut']),
    interpolation: z.enum(['joint', 'limb']).optional(),
    path: z.array(poseSchema).min(2).max(81).optional(),
    pose: poseSchema,
    jointsUnderLoad: z.array(z.enum(boneNames)),
    provenance: z.enum(['attested', 'unverified']),
  })
  .strict();
export const flowFramesSchema = z
  .array(keyframeSchema)
  .min(7)
  .superRefine((f, ctx) => {
    if (!f.length) return;
    const error = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (f[0].phase !== 'neutral' || f.at(-1)?.phase !== 'neutral')
      error('Flow must start and end neutral');
    const ranks = ['prep', 'transition', 'final', 'hold', 'exit'];
    let rank = -1;
    for (const key of f.slice(1, -1)) {
      const next = ranks.indexOf(key.phase);
      if (next < 0 || next < rank) error(`Out-of-order phase: ${key.phase}`);
      rank = next;
    }
    for (const phase of ranks)
      if (!f.some((key) => key.phase === phase)) error(`Missing phase: ${phase}`);
    if (new Set(f.map((k) => k.id)).size !== f.length) error('Keyframe ids must be unique');
    function samePose(a: z.infer<typeof poseSchema>, b: z.infer<typeof poseSchema>) {
      const sameQ = (x: number[], y: number[]) =>
        Math.abs(Math.abs(x.reduce((s, v, i) => s + v * y[i], 0)) - 1) < 0.00001;
      return (
        a.root.position.every((v, i) => Math.abs(v - b.root.position[i]) < 0.00001) &&
        sameQ(a.root.rotation, b.root.rotation) &&
        boneNames.every((n) => a.bones[n] && b.bones[n] && sameQ(a.bones[n]!, b.bones[n]!))
      );
    }
    if (!samePose(f[0].pose, f.at(-1)!.pose)) error('Start and end neutral poses must match');
    f.forEach((frame, i) => {
      if (
        frame.path &&
        (!samePose(frame.path[0], f[Math.max(0, i - 1)].pose) ||
          !samePose(frame.path.at(-1)!, frame.pose))
      )
        error('Collision-checked path must match its neighboring pose endpoints');
    });
    const final = f.find((k) => k.phase === 'final');
    if (final && f.some((k) => k.phase === 'hold' && !samePose(k.pose, final.pose)))
      error('Hold must preserve the final pose');
  });
export const sourceSchema = z
  .object({
    text: z.string().min(1),
    chapter: z.string(),
    verse: z.string(),
    edition: z.string().min(1),
    url: z
      .string()
      .url()
      .refine((url) => /^https?:\/\//.test(url), 'Use an HTTP(S) source URL'),
    provenance: z.enum(['attested', 'unverified']),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.provenance === 'attested' && (!s.chapter.trim() || !s.verse.trim()))
      ctx.addIssue({ code: 'custom', message: 'Attested sources require chapter and verse' });
  });
export const asanaSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().regex(/^[a-z]+(?:-[a-z]+)*$/),
    sanskrit: z.string().min(1),
    iast: z.string().min(1),
    translit: z.string().regex(/^[\x20-\x7E]+$/),
    english: z.string().min(1),
    aliases: z.array(z.string()),
    source: z.array(sourceSchema).min(1),
    provenance: z.enum(['attested', 'unverified']),
    tier: z.enum(['classical', 'transitional']),
    family: z.enum([
      'seated',
      'standing',
      'supine',
      'prone',
      'inverted',
      'balance',
      'meditative',
      'bandha-mudra',
    ]),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    traditionalClaims: z.array(z.string()),
    modernNotes: z.array(z.string()).optional(),
    contraindications: z.array(z.string()),
    breath: z.string(),
    drishti: z.string().optional(),
    bandhas: z.array(z.string()).optional(),
    counterpose: z.array(z.string()).optional(),
    relatedAsanas: z.array(z.string()),
    keyframes: flowFramesSchema,
    description: z.string().min(1),
    interpretationNotes: z.array(z.string()),
    fieldProvenance: z
      .object({
        movement: z.literal('unverified'),
        difficulty: z.literal('unverified'),
        anatomy: z.literal('unverified'),
        contraindications: z.enum(['attested', 'unverified']),
        breath: z.enum(['attested', 'unverified']),
        drishti: z.enum(['attested', 'unverified']),
      })
      .strict(),
  })
  .strict()
  .superRefine((a, ctx) => {
    if (a.provenance === 'attested' && !a.source.some((s) => s.provenance === 'attested'))
      ctx.addIssue({ code: 'custom', message: 'Attested entry needs an attested source' });
  });
export type Pose = z.infer<typeof poseSchema>;
export type Keyframe = z.infer<typeof keyframeSchema>;
export type Asana = z.infer<typeof asanaSchema>;
export const sequenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('reference-sequence'),
    name: z.string().min(1),
    provenance: z.literal('unverified'),
    transitionSeconds: z.number().min(0.1).max(30),
    asanas: z.array(z.string()).min(1),
  })
  .strict();
