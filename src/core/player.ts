import { useEffect, useState } from 'react';
import { create } from 'zustand';
import type { Keyframe } from './schema';
import { duration, frameTime } from './timeline';
export const clock = { time: 0 };
type Player = {
  frames: Keyframe[];
  time: number;
  playing: boolean;
  speed: number;
  loop: boolean;
  stepped: boolean;
  anatomy: boolean;
  pristine: boolean;
  configure: (frames: Keyframe[]) => void;
  seek: (time: number) => void;
  toggle: () => void;
  step: (index: number) => void;
};
export const usePlayer = create<Player>((set, get) => ({
  frames: [],
  time: 0,
  playing: false,
  speed: 1,
  loop: false,
  stepped: false,
  anatomy: false,
  pristine: true,
  configure: (frames) => {
    const i = Math.max(
      0,
      frames.findIndex((f) => f.phase === 'hold'),
    );
    clock.time = frameTime(frames, i);
    set({ frames, time: clock.time, playing: false, pristine: true });
  },
  seek: (time) => {
    clock.time = Math.max(0, Math.min(duration(get().frames), time));
    set({ time: clock.time, pristine: false });
  },
  toggle: () => {
    const state = get();
    if (state.stepped) return;
    if (!state.playing && (state.pristine || clock.time >= duration(state.frames))) clock.time = 0;
    set({ playing: !state.playing, time: clock.time, pristine: false });
  },
  step: (index) => {
    const frames = get().frames;
    index = Math.max(0, Math.min(frames.length - 1, index));
    clock.time = frameTime(frames, index);
    set({ playing: false, stepped: true, pristine: false, time: clock.time });
  },
}));
export function usePlayerClock() {
  const playing = usePlayer((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let raf = 0,
      last = 0,
      painted = 0;
    function tick(now: number) {
      const state = usePlayer.getState();
      if (state.playing && !document.hidden) {
        clock.time += Math.min(0.1, last ? (now - last) / 1000 : 0) * state.speed;
        const total = duration(state.frames);
        if (clock.time >= total) {
          clock.time = state.loop && total ? clock.time % total : total;
          if (!state.loop) usePlayer.setState({ playing: false });
        }
        if (now - painted > 80 || !usePlayer.getState().playing) {
          painted = now;
          usePlayer.setState({ time: clock.time });
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  return reduced;
}
