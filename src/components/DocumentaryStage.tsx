import React, { useEffect, useRef, useState } from 'react';
import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  DOCUMENTARY_SCENES,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  TOTAL_DURATION,
  formatTimecode,
} from '../documentary/timeline';
import { renderDocumentaryFrame } from '../documentary/scenes';

interface DocumentaryStageProps {
  currentTime: number;
  isPlaying: boolean;
  speed: number;
  isMuted: boolean;
  volume: number;
  onTogglePlay: () => void;
  onSeek: (sec: number) => void;
  onChangeSpeed: (speed: number) => void;
  onToggleMute: () => void;
  onChangeVolume: (vol: number) => void;
}

export const DocumentaryStage: React.FC<DocumentaryStageProps> = ({
  currentTime,
  isPlaying,
  speed,
  isMuted,
  volume,
  onTogglePlay,
  onSeek,
  onChangeSpeed,
  onToggleMute,
  onChangeVolume,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const scrubRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverSec, setHoverSec] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState<number>(0);

  // Render current frame deterministically whenever currentTime updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderDocumentaryFrame(ctx, currentTime, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  }, [currentTime]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    const el = stageWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  };

  const activeScene =
    DOCUMENTARY_SCENES.find((s) => currentTime >= s.startSec && currentTime < s.endSec) ??
    DOCUMENTARY_SCENES[DOCUMENTARY_SCENES.length - 1];

  const handleScrubPointer = (clientX: number) => {
    const bar = scrubRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(ratio * TOTAL_DURATION);
  };

  const jumpPrevScene = () => {
    const idx = DOCUMENTARY_SCENES.findIndex((s) => s.id === activeScene.id);
    if (currentTime - activeScene.startSec > 2.5 || idx <= 0) {
      onSeek(activeScene.startSec);
    } else {
      onSeek(DOCUMENTARY_SCENES[idx - 1].startSec);
    }
  };

  const jumpNextScene = () => {
    const idx = DOCUMENTARY_SCENES.findIndex((s) => s.id === activeScene.id);
    if (idx < DOCUMENTARY_SCENES.length - 1) {
      onSeek(DOCUMENTARY_SCENES[idx + 1].startSec);
    } else {
      onSeek(0);
    }
  };

  const pct = (currentTime / TOTAL_DURATION) * 100;

  return (
    <div ref={stageWrapperRef} className="flex flex-col gap-3 bg-[#050811]">
      {/* 16:9 Cinema Stage */}
      <div className="relative w-full overflow-hidden rounded-xl border border-slate-800/80 bg-[#040710]">
        <div className="aspect-video w-full">
          <canvas
            ref={canvasRef}
            width={LOGICAL_WIDTH}
            height={LOGICAL_HEIGHT}
            onClick={onTogglePlay}
            className="h-full w-full cursor-pointer object-contain"
          />
        </div>

        {/* Quiet Corner Time / Scene Overlay on Hover */}
        <div className="pointer-events-none absolute top-3 right-3 flex items-center gap-2 rounded-md bg-slate-950/75 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-sm">
          <span>{activeScene.title}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular text-cyan-300">1920×1080 · 30 FPS</span>
        </div>
      </div>

      {/* Transport & Timeline Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-[#090F1E] p-4">
        {/* Scrubber Bar with 6 Scene Tick Markers */}
        <div className="flex flex-col gap-1.5">
          <div
            ref={scrubRef}
            role="slider"
            aria-label="Documentary timeline scrubber"
            aria-valuemin={0}
            aria-valuemax={TOTAL_DURATION}
            aria-valuenow={Math.round(currentTime)}
            tabIndex={0}
            onClick={(e) => handleScrubPointer(e.clientX)}
            onMouseMove={(e) => {
              const bar = scrubRef.current;
              if (!bar) return;
              const rect = bar.getBoundingClientRect();
              const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setHoverPct(ratio * 100);
              setHoverSec(ratio * TOTAL_DURATION);
            }}
            onMouseLeave={() => setHoverSec(null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') onSeek(Math.min(TOTAL_DURATION, currentTime + 5));
              if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
            }}
            className="group relative h-3 w-full cursor-pointer rounded-full bg-slate-800/90 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            {/* Progress fill */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-400"
              style={{ width: `${pct}%` }}
            />
            {/* Scene Boundary Dividers */}
            {DOCUMENTARY_SCENES.slice(1).map((sc) => (
              <div
                key={sc.id}
                title={sc.title}
                className="absolute top-0 h-full w-0.5 bg-slate-950/90"
                style={{ left: `${(sc.startSec / TOTAL_DURATION) * 100}%` }}
              />
            ))}
            {/* Playhead thumb */}
            <div
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 bg-slate-950 shadow-sm transition-transform group-hover:scale-110"
              style={{ left: `${pct}%` }}
            />
            {/* Hover time tooltip */}
            {hoverSec !== null && (
              <div
                className="pointer-events-none absolute -top-8 -translate-x-1/2 rounded bg-slate-900 px-2 py-0.5 text-[11px] font-mono-tabular text-slate-200 ring-1 ring-slate-700"
                style={{ left: `${hoverPct}%` }}
              >
                {formatTimecode(hoverSec)}
              </div>
            )}
          </div>
        </div>

        {/* Playback Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTogglePlay}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-cyan-300 whitespace-nowrap shrink-0"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isPlaying ? 'Pause' : currentTime >= TOTAL_DURATION ? 'Replay' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={jumpPrevScene}
              aria-label="Previous scene"
              title="Previous scene"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={jumpNextScene}
              aria-label="Next scene"
              title="Next scene"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => onSeek(0)}
              aria-label="Restart documentary"
              title="Restart"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700/80 bg-slate-900 text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            <div className="ml-2 text-sm font-mono-tabular text-slate-300 whitespace-nowrap shrink-0">
              <span className="text-slate-100">{formatTimecode(currentTime)}</span>
              <span className="mx-1 text-slate-600">/</span>
              <span className="text-slate-400">{formatTimecode(TOTAL_DURATION)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Background Score Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleMute}
                aria-label={isMuted ? 'Unmute background score' : 'Mute background score'}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:text-cyan-300"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <label className="sr-only" htmlFor="music-vol">
                Music Volume
              </label>
              <input
                id="music-vol"
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : Math.round(volume * 100)}
                onChange={(e) => onChangeVolume(Number(e.target.value) / 100)}
                className="h-1.5 w-20 cursor-pointer accent-cyan-400"
                title={`Music Volume: ${isMuted ? 0 : Math.round(volume * 100)}%`}
              />
            </div>

            {/* Playback Speed */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1 ring-1 ring-slate-800">
              {[0.75, 1, 1.5, 2].map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => onChangeSpeed(sp)}
                  className={`rounded-md px-2.5 py-1 text-xs font-mono-tabular font-medium transition-colors whitespace-nowrap shrink-0 ${
                    speed === sp
                      ? 'bg-slate-800 text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sp}×
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:text-cyan-300"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* 6 Scene Chapter Selector Strip */}
        <div id="chapters" className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3 lg:grid-cols-6">
          {DOCUMENTARY_SCENES.map((sc) => {
            const active = sc.id === activeScene.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => onSeek(sc.startSec)}
                className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                  active
                    ? 'border-cyan-500/70 bg-cyan-950/30 text-slate-100'
                    : 'border-slate-800/80 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span className="w-full truncate text-xs font-semibold text-inherit">
                  {sc.shortTitle}
                </span>
                <span className="mt-0.5 text-[11px] font-mono-tabular text-slate-500">
                  {sc.timeRange}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
