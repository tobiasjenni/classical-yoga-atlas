import { lazy, Suspense, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Repeat2, Bone } from 'lucide-react';
import type { Keyframe } from '../core/schema';
import { duration, locate, sample } from '../core/motion';
import { clock, usePlayer, useReducedMotion } from '../core/player';
const Stage = lazy(() => import('./Stage'));
export function useFlow(frames: Keyframe[]) {
  const configure = usePlayer((s) => s.configure),
    reduced = useReducedMotion();
  useEffect(() => {
    configure(frames);
    return () => {
      usePlayer.setState({ playing: false });
    };
  }, [frames, configure]);
  useEffect(() => {
    if (reduced) usePlayer.setState({ playing: false, stepped: true });
  }, [reduced]);
}
export function FlowScene({
  frames,
  syncDuration,
  label,
}: {
  frames: Keyframe[];
  syncDuration?: number;
  label?: string;
}) {
  const { time, playing, stepped, anatomy } = usePlayer(),
    reduced = useReducedMotion();
  const factor = syncDuration ? duration(frames) / syncDuration : 1;
  const framingPoses = useMemo(() => frames.map((f) => f.pose), [frames]);
  const at = time * factor,
    current = frames[locate(frames, at).index];
  return (
    <Suspense fallback={<div className="stage loading">Loading 3D reference…</div>}>
      <Stage
        label={label}
        framingPoses={framingPoses}
        pose={sample(frames, at, stepped || reduced)}
        getPose={
          playing && !stepped && !reduced ? () => sample(frames, clock.time * factor) : undefined
        }
        joints={anatomy ? current.jointsUnderLoad : []}
      />
    </Suspense>
  );
}
const timestamp = (n: number) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
export default function FlowPlayer({ frames }: { frames: Keyframe[] }) {
  const state = usePlayer(),
    reduced = useReducedMotion();
  const { index } = locate(frames, state.time),
    current = frames[index],
    total = duration(frames);
  return (
    <section className="flow-player" aria-label="Movement playback">
      <div className="instruction-bar">
        <span className="phase-number">{String(index + 1).padStart(2, '0')}</span>
        <div>
          <span className="eyebrow">
            {current.phase}{' '}
            <span className="breath-badge">{current.breath ?? 'free'} breath · unverified</span>
          </span>
          <p aria-live={state.playing ? 'off' : 'polite'}>{current.instruction}</p>
        </div>
      </div>
      <div className="playback">
        <button
          className="play-button"
          aria-label={state.playing ? 'Pause movement' : 'Play movement'}
          disabled={reduced || state.stepped}
          onClick={state.toggle}
        >
          {state.playing ? <Pause size={19} /> : <Play size={19} fill="currentColor" />}
        </button>
        <button
          className="icon-button"
          aria-label="Previous keyframe"
          disabled={index === 0}
          onClick={() => state.step(index - 1)}
        >
          <ChevronLeft size={19} />
        </button>
        <button
          className="icon-button"
          aria-label="Next keyframe"
          disabled={index === frames.length - 1}
          onClick={() => state.step(index + 1)}
        >
          <ChevronRight size={19} />
        </button>
        <input
          className="scrubber"
          aria-label="Movement timeline"
          type="range"
          min="0"
          max={total}
          step="0.01"
          value={state.time}
          onChange={(e) => state.seek(Number(e.target.value))}
        />
        <span className="time-readout">
          {timestamp(state.time)} / {timestamp(total)}
        </span>
        <select
          aria-label="Playback speed"
          value={state.speed}
          onChange={(e) => usePlayer.setState({ speed: Number(e.target.value) })}
        >
          {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
            <option value={s} key={s}>
              {s}×
            </option>
          ))}
        </select>
        <button
          className="icon-button"
          aria-label="Loop playback"
          aria-pressed={state.loop}
          onClick={() => usePlayer.setState({ loop: !state.loop })}
        >
          <Repeat2 size={18} />
        </button>
      </div>
      <div className="player-options">
        <label className="check-label">
          <input
            type="checkbox"
            checked={state.stepped || reduced}
            disabled={reduced}
            onChange={(e) => usePlayer.setState({ stepped: e.target.checked, playing: false })}
          />{' '}
          {reduced ? 'Reduced motion · static keyframes' : 'Step-through mode'}
        </label>
        <button
          className="text-button"
          aria-pressed={state.anatomy}
          onClick={() => usePlayer.setState({ anatomy: !state.anatomy })}
        >
          <Bone size={15} /> {state.anatomy ? 'Hide joint highlights' : 'Show joint highlights'}
        </button>
      </div>
      <div className="flow-steps" aria-label="Keyframes">
        {frames.map((frame, i) => (
          <button
            key={frame.id}
            aria-label={`Keyframe ${i + 1}: ${frame.phase}`}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => state.step(i)}
          >
            <span />
            {frame.phase}
          </button>
        ))}
      </div>
      <p className="micro reconstruction-note">
        Movement is an unverified reconstruction. Timing, breath cues and joint highlights are
        editorial, not instructions from the cited verse.
      </p>
    </section>
  );
}
