import React, { useRef, useState } from 'react';
import { Download, Film, X } from 'lucide-react';
import {
  DOCUMENTARY_SCENES,
  TOTAL_DURATION,
  buildVoiceoverMarkdown,
} from '../documentary/timeline';
import { ExportProgress, exportDocumentaryMp4 } from '../documentary/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [selectedScope, setSelectedScope] = useState<'full' | number>('full');
  const [includeMusic, setIncludeMusic] = useState(true);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  const isExporting = progress !== null && progress.phase !== 'done';

  const handleStartExport = async () => {
    setErrorMsg(null);
    const controller = new AbortController();
    abortRef.current = controller;

    let startSec = 0;
    let endSec = TOTAL_DURATION;
    let filename = 'RREF_Documentary_Full_1080p30.mp4';

    if (selectedScope !== 'full') {
      const sc = DOCUMENTARY_SCENES.find((s) => s.id === selectedScope);
      if (sc) {
        startSec = sc.startSec;
        endSec = sc.endSec;
        filename = `RREF_Scene${sc.id}_1080p30.mp4`;
      }
    }

    try {
      await exportDocumentaryMp4(
        startSec,
        endSec,
        includeMusic,
        filename,
        (p) => setProgress(p),
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).message !== 'Export cancelled') {
        setErrorMsg((err as Error).message || 'Export failed');
      }
      setProgress(null);
    } finally {
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setProgress(null);
    } else {
      onClose();
    }
  };

  const handleDownloadScript = () => {
    const md = buildVoiceoverMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RREF_Voiceover_Sync_Script.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#090F1E] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 id="export-modal-title" className="text-lg font-semibold text-slate-100">
              Export 1080p H.264 Video
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Renders exact 1920×1080 · 30 FPS · 16:9 frames and encodes H.264 MP4 via FFmpeg.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close export modal"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="export-scope" className="text-xs font-medium text-slate-300">
              Render Range
            </label>
            <select
              id="export-scope"
              disabled={isExporting}
              value={selectedScope}
              onChange={(e) =>
                setSelectedScope(e.target.value === 'full' ? 'full' : Number(e.target.value))
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-60"
            >
              <option value="full">Full Documentary (05:00 · 9,000 frames)</option>
              {DOCUMENTARY_SCENES.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.title} ({sc.timeRange} · {(sc.endSec - sc.startSec) * 30} frames)
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-200">
            <input
              type="checkbox"
              disabled={isExporting}
              checked={includeMusic}
              onChange={(e) => setIncludeMusic(e.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            <span>Include subtle 48 kHz AAC ambient underscore (voiceover-safe level)</span>
          </label>

          {progress && (
            <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-cyan-300">{progress.message}</span>
                <span className="font-mono-tabular text-slate-300">{progress.percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-150"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200">
              {errorMsg}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={handleDownloadScript}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:text-cyan-300 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Voiceover Script (.md)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {isExporting ? 'Cancel Export' : 'Close'}
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleStartExport}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Film className="h-4 w-4" />
              <span>{isExporting ? 'Rendering…' : 'Render MP4'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
