import type { Keyframe } from './schema.ts';
export const duration = (frames: Keyframe[]) => frames.reduce((total, f) => total + f.duration, 0);
export const frameTime = (frames: Keyframe[], index: number) =>
  frames.slice(0, index).reduce((n, f) => n + f.duration, 0);
export function locate(frames: Keyframe[], time: number) {
  let start = 0;
  for (let index = 0; index < frames.length; index++) {
    if (time < start + frames[index].duration || index === frames.length - 1)
      return {
        index,
        start,
        progress: Math.max(0, Math.min(1, (time - start) / frames[index].duration)),
      };
    start += frames[index].duration;
  }
  return { index: 0, start: 0, progress: 0 };
}
