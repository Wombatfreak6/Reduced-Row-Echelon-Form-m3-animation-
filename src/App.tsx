import { useCallback, useEffect, useRef, useState } from 'react';
import { Film } from 'lucide-react';
import { DocumentaryStage } from './components/DocumentaryStage';
import { StudioDeck } from './components/StudioDeck';
import { ExportModal } from './components/ExportModal';
import { DocumentaryMusicEngine } from './documentary/musicEngine';
import { DOCUMENTARY_SCENES, TOTAL_DURATION, VOICEOVER_CUES } from './documentary/timeline';

export default function App() {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.28);
  const [exportOpen, setExportOpen] = useState<boolean>(false);

  const musicRef = useRef<DocumentaryMusicEngine | null>(null);
  const timeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    musicRef.current = new DocumentaryMusicEngine();
    return () => {
      musicRef.current?.dispose();
    };
  }, []);

  const handleSeek = useCallback(
    (sec: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_DURATION, sec));
      timeRef.current = clamped;
      setCurrentTime(clamped);
      musicRef.current?.syncToTime(clamped);
    },
    [],
  );

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next) {
        if (timeRef.current >= TOTAL_DURATION - 0.05) {
          timeRef.current = 0;
          setCurrentTime(0);
        }
        musicRef.current?.start(timeRef.current);
      } else {
        musicRef.current?.pause();
      }
      return next;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      musicRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleChangeVolume = useCallback((vol: number) => {
    setVolume(vol);
    if (vol > 0) {
      setIsMuted(false);
      musicRef.current?.setMuted(false);
    }
    musicRef.current?.setVolume(vol);
  }, []);

  // Animation loop when playing
  useEffect(() => {
    if (!isPlaying) {
      lastTickRef.current = null;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = (now: number) => {
      if (lastTickRef.current === null) {
        lastTickRef.current = now;
      }
      const dt = Math.min(0.1, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      const nextTime = Math.min(TOTAL_DURATION, timeRef.current + dt * speed);
      timeRef.current = nextTime;
      setCurrentTime(nextTime);
      musicRef.current?.syncToTime(nextTime);

      if (nextTime >= TOTAL_DURATION) {
        setIsPlaying(false);
        musicRef.current?.pause();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed]);

  // Global keyboard shortcuts (Space = Play/Pause, Left/Right = Seek 5s)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(timeRef.current + 5);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(timeRef.current - 5);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSeek, handleTogglePlay]);

  const activeScene =
    DOCUMENTARY_SCENES.find((s) => currentTime >= s.startSec && currentTime < s.endSec) ??
    DOCUMENTARY_SCENES[DOCUMENTARY_SCENES.length - 1];

  const activeCue =
    VOICEOVER_CUES.find((c) => currentTime >= c.startSec && currentTime < c.endSec) ??
    VOICEOVER_CUES[VOICEOVER_CUES.length - 1];

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100">
      {/* Three-Zone Top Bar */}
      <header className="border-b border-slate-800/80 bg-[#060A16]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-6 py-3.5">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0"
          >
            Reduced Row Echelon Form
          </a>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-400 md:flex">
            <a
              href="#stage"
              onClick={(e) => {
                e.preventDefault();
                handleSeek(0);
              }}
              className="transition-colors hover:text-slate-100 whitespace-nowrap shrink-0"
            >
              Opening
            </a>
            <a
              href="#chapters"
              onClick={(e) => {
                e.preventDefault();
                handleSeek(85);
              }}
              className="transition-colors hover:text-slate-100 whitespace-nowrap shrink-0"
            >
              Row Operations
            </a>
            <a
              href="#worked"
              onClick={(e) => {
                e.preventDefault();
                handleSeek(180);
              }}
              className="transition-colors hover:text-slate-100 whitespace-nowrap shrink-0"
            >
              Worked Example
            </a>
            <a
              href="#conclusion"
              onClick={(e) => {
                e.preventDefault();
                handleSeek(270);
              }}
              className="transition-colors hover:text-slate-100 whitespace-nowrap shrink-0"
            >
              Interpretation
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (isPlaying) handleTogglePlay();
                setExportOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
            >
              <Film className="h-3.5 w-3.5" />
              <span>Export MP4</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Zone Documentary Stage + Companion Studio Deck */}
      <main id="stage" className="mx-auto max-w-[1440px] px-6 py-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
              How Matrices Reveal the Solutions to Linear Systems
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{activeScene.title}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{activeScene.timeRange}</span>
              <span aria-hidden="true">·</span>
              <span>16:9 Mathematical Documentary</span>
            </div>
          </div>

          <p className="max-w-md text-xs leading-relaxed text-slate-400">
            {activeCue.narration}
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <DocumentaryStage
              currentTime={currentTime}
              isPlaying={isPlaying}
              speed={speed}
              isMuted={isMuted}
              volume={volume}
              onTogglePlay={handleTogglePlay}
              onSeek={handleSeek}
              onChangeSpeed={setSpeed}
              onToggleMute={handleToggleMute}
              onChangeVolume={handleChangeVolume}
            />
          </div>

          <div className="xl:col-span-4">
            <StudioDeck currentTime={currentTime} onSeek={handleSeek} />
          </div>
        </div>
      </main>

      <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
