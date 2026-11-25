import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, RotateCcw, StepForward } from 'lucide-react';
import {
  DOCUMENTARY_SCENES,
  VOICEOVER_CUES,
  buildVoiceoverMarkdown,
} from '../documentary/timeline';
import {
  Fraction,
  MatrixData,
  WORKED_STEPS,
  analyzeMatrix,
  cloneMatrix,
  replaceRow,
  scaleRow,
  swapRows,
} from '../math/fraction';

interface StudioDeckProps {
  currentTime: number;
  onSeek: (sec: number) => void;
}

export const StudioDeck: React.FC<StudioDeckProps> = ({ currentTime, onSeek }) => {
  const [activeTab, setActiveTab] = useState<'narration' | 'math'>('narration');
  const activeCueRef = useRef<HTMLButtonElement | null>(null);

  // Interactive Sandbox Matrix initialized to opening system
  const [sandboxMatrix, setSandboxMatrix] = useState<MatrixData>(() =>
    cloneMatrix(WORKED_STEPS[0].matrix),
  );
  const [sandboxStepCursor, setSandboxStepCursor] = useState<number>(0);
  const [opType, setOpType] = useState<'swap' | 'scale' | 'replace'>('scale');
  const [targetRow, setTargetRow] = useState<number>(0);
  const [sourceRow, setSourceRow] = useState<number>(1);
  const [factorNum, setFactorNum] = useState<string>('1');
  const [factorDen, setFactorDen] = useState<string>('2');
  const [opError, setOpError] = useState<string | null>(null);

  const activeCue = useMemo(() => {
    return (
      VOICEOVER_CUES.find((c) => currentTime >= c.startSec && currentTime < c.endSec) ??
      VOICEOVER_CUES[VOICEOVER_CUES.length - 1]
    );
  }, [currentTime]);

  // Smoothly scroll active voiceover cue into view when tab is open
  useEffect(() => {
    if (activeTab === 'narration' && activeCueRef.current) {
      activeCueRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeCue.id, activeTab]);

  // Determine documentary matrix synced to current timestamp
  const syncedWorkedStep = useMemo(() => {
    if (currentTime < 180) return WORKED_STEPS[0];
    let found = WORKED_STEPS[0];
    for (const s of WORKED_STEPS) {
      if (currentTime >= s.startSec) found = s;
    }
    return found;
  }, [currentTime]);

  const sandboxCheck = useMemo(() => analyzeMatrix(sandboxMatrix), [sandboxMatrix]);

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

  const applyCustomOperation = () => {
    setOpError(null);
    const num = Number.parseInt(factorNum, 10);
    const den = Number.parseInt(factorDen, 10);

    if (opType === 'swap') {
      if (targetRow === sourceRow) {
        setOpError('Select two different rows to swap.');
        return;
      }
      setSandboxMatrix((m) => swapRows(m, targetRow, sourceRow));
      return;
    }

    if (!Number.isInteger(num) || !Number.isInteger(den) || den === 0) {
      setOpError('Enter a valid nonzero integer numerator and denominator.');
      return;
    }

    const factor = new Fraction(num, den);
    if (opType === 'scale') {
      if (factor.isZero()) {
        setOpError('Row scaling factor c cannot be 0.');
        return;
      }
      setSandboxMatrix((m) => scaleRow(m, targetRow, factor));
      return;
    }

    if (targetRow === sourceRow) {
      setOpError('Target and source rows must differ for row replacement.');
      return;
    }
    setSandboxMatrix((m) => replaceRow(m, targetRow, sourceRow, factor));
  };

  const stepNextWorkedExample = () => {
    setOpError(null);
    const nextIdx = Math.min(WORKED_STEPS.length - 1, sandboxStepCursor + 1);
    setSandboxStepCursor(nextIdx);
    setSandboxMatrix(cloneMatrix(WORKED_STEPS[nextIdx].matrix));
  };

  const resetSandbox = () => {
    setOpError(null);
    setSandboxStepCursor(0);
    setSandboxMatrix(cloneMatrix(WORKED_STEPS[0].matrix));
  };

  return (
    <aside className="flex h-full flex-col rounded-xl border border-slate-800/80 bg-[#090F1E]">
      {/* Segmented Control Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-950 p-1 ring-1 ring-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('narration')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'narration'
                ? 'bg-slate-800 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Voiceover Script
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('math')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'math'
                ? 'bg-slate-800 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Math & Sandbox
          </button>
        </div>

        {activeTab === 'narration' && (
          <button
            type="button"
            onClick={handleDownloadScript}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600 hover:text-cyan-300 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Script (.md)</span>
          </button>
        )}
      </div>

      {/* Tab 1: Synchronized Voiceover Narration Script */}
      {activeTab === 'narration' ? (
        <div id="narration" className="flex max-h-[680px] flex-col gap-4 overflow-y-auto p-4">
          <p className="text-xs leading-relaxed text-slate-400">
            Six synchronized voiceover chapters with visual timing cues and built-in pauses for manual narration recording. Click any cue to jump the timeline.
          </p>

          {DOCUMENTARY_SCENES.map((scene) => {
            const cues = VOICEOVER_CUES.filter((c) => c.sceneNumber === scene.id);
            const isCurrentScene =
              currentTime >= scene.startSec && currentTime < scene.endSec;

            return (
              <div key={scene.id} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between border-b border-slate-800/70 pb-1.5">
                  <h3
                    className={`text-xs font-semibold ${
                      isCurrentScene ? 'text-cyan-300' : 'text-slate-300'
                    }`}
                  >
                    {scene.title}
                  </h3>
                  <span className="font-mono-tabular text-[11px] text-slate-500">
                    {scene.timeRange}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {cues.map((cue) => {
                    const isActive = cue.id === activeCue.id;
                    return (
                      <button
                        key={cue.id}
                        ref={isActive ? activeCueRef : null}
                        type="button"
                        onClick={() => onSeek(cue.startSec)}
                        className={`flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors ${
                          isActive
                            ? 'border-cyan-500/60 bg-cyan-950/25'
                            : 'border-slate-800/70 bg-slate-950/50 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span
                            className={`font-mono-tabular font-semibold ${
                              isActive ? 'text-cyan-300' : 'text-slate-400'
                            }`}
                          >
                            {cue.timestampLabel}
                          </span>
                          {cue.pauseHint && (
                            <span className="text-amber-300/90">{cue.pauseHint}</span>
                          )}
                        </div>
                        <p className="text-sm leading-relaxed text-slate-100">
                          “{cue.narration}”
                        </p>
                        <p className="text-xs leading-snug text-slate-400">
                          Visual: {cue.visualAction}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Tab 2: Live Math Verification & Interactive Row Operation Sandbox */
        <div id="math-proof" className="flex max-h-[680px] flex-col gap-4 overflow-y-auto p-4">
          {/* Synced Documentary Step Readout */}
          <div className="flex flex-col gap-2 border-b border-slate-800/80 pb-4">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-300">
                Documentary Worked State
              </h3>
              <span className="font-mono-tabular text-xs text-cyan-300">
                {syncedWorkedStep.phase}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {syncedWorkedStep.title} ·{' '}
              <span className="font-math text-slate-200">
                {syncedWorkedStep.operationLabel}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-4 gap-1.5 rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 font-mono-tabular text-sm">
              {syncedWorkedStep.matrix.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={`flex h-8 items-center justify-center rounded ${
                      c === 3 ? 'border-l border-slate-700/80 text-teal-300' : 'text-slate-100'
                    }`}
                  >
                    {val.toString()}
                  </div>
                )),
              )}
            </div>
          </div>

          {/* Interactive Matrix Sandbox */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200">
                Interactive Exact-Rational Sandbox
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={stepNextWorkedExample}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-cyan-300 hover:border-cyan-500/60 whitespace-nowrap shrink-0"
                >
                  <StepForward className="h-3.5 w-3.5" />
                  <span>Step {Math.min(7, sandboxStepCursor + 1)}/7</span>
                </button>
                <button
                  type="button"
                  onClick={resetSandbox}
                  aria-label="Reset sandbox matrix"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-slate-100 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Sandbox Matrix Grid */}
            <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono-tabular text-sm">
              {sandboxMatrix.map((row, r) =>
                row.map((val, c) => {
                  const isPivot = sandboxCheck.pivots.some(
                    (p) => p.row === r && p.col === c,
                  );
                  return (
                    <div
                      key={`sb-${r}-${c}`}
                      className={`flex h-9 items-center justify-center rounded ${
                        c === 3 ? 'border-l border-slate-700/80' : ''
                      } ${
                        isPivot
                          ? 'bg-cyan-950/60 font-semibold text-cyan-300 ring-1 ring-cyan-500/50'
                          : 'text-slate-100'
                      }`}
                    >
                      {val.toString()}
                    </div>
                  );
                }),
              )}
            </div>

            {/* REF / RREF Invariants Checklist */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 text-xs">
              <div className="mb-1 flex items-center justify-between font-semibold">
                <span className="text-slate-300">Echelon Verification</span>
                <span
                  className={
                    sandboxCheck.isRREF
                      ? 'text-teal-300'
                      : sandboxCheck.isREF
                        ? 'text-cyan-300'
                        : 'text-slate-400'
                  }
                >
                  {sandboxCheck.isRREF
                    ? 'RREF Verified'
                    : sandboxCheck.isREF
                      ? 'REF Verified'
                      : 'In Progress'}
                </span>
              </div>
              {[
                ['Zero rows at bottom', sandboxCheck.zeroRowsAtBottom],
                ['Pivots step strictly right', sandboxCheck.pivotsShiftRight],
                ['Zeros below every pivot', sandboxCheck.zerosBelowPivots],
                ['Every leading entry = 1', sandboxCheck.pivotsEqualOne],
                ['Zeros above every pivot', sandboxCheck.zerosAbovePivots],
              ].map(([label, ok]) => (
                <div key={String(label)} className="flex items-center justify-between">
                  <span className="text-slate-400">{label}</span>
                  <span
                    className={`inline-flex items-center gap-1 font-mono-tabular ${
                      ok ? 'text-teal-300' : 'text-slate-500'
                    }`}
                  >
                    {ok && <Check className="h-3.5 w-3.5" />}
                    {ok ? 'Pass' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>

            {/* Custom Row Operation Builder */}
            <div className="flex flex-col gap-2.5 rounded-lg border border-slate-800/80 bg-slate-950/60 p-3">
              <div className="flex items-center gap-1 rounded-md bg-slate-900 p-1">
                {(
                  [
                    ['swap', 'Swap'],
                    ['scale', 'Scale'],
                    ['replace', 'Replace'],
                  ] as const
                ).map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setOpType(k);
                      setOpError(null);
                    }}
                    className={`flex-1 rounded py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                      opType === k
                        ? 'bg-slate-800 text-cyan-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  aria-label="Target row"
                  value={targetRow}
                  onChange={(e) => setTargetRow(Number(e.target.value))}
                  className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-100"
                >
                  <option value={0}>R1</option>
                  <option value={1}>R2</option>
                  <option value={2}>R3</option>
                </select>

                <span className="text-slate-400">
                  {opType === 'swap' ? '↔' : opType === 'scale' ? '→' : '→ R +'}
                </span>

                {opType !== 'swap' && (
                  <div className="flex items-center gap-1">
                    <input
                      aria-label="Factor numerator"
                      type="text"
                      value={factorNum}
                      onChange={(e) => setFactorNum(e.target.value)}
                      className="w-12 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-center font-mono-tabular text-slate-100"
                    />
                    <span className="text-slate-500">/</span>
                    <input
                      aria-label="Factor denominator"
                      type="text"
                      value={factorDen}
                      onChange={(e) => setFactorDen(e.target.value)}
                      className="w-12 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-center font-mono-tabular text-slate-100"
                    />
                  </div>
                )}

                {opType !== 'scale' && (
                  <select
                    aria-label="Source row"
                    value={sourceRow}
                    onChange={(e) => setSourceRow(Number(e.target.value))}
                    className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-100"
                  >
                    <option value={0}>R1</option>
                    <option value={1}>R2</option>
                    <option value={2}>R3</option>
                  </select>
                )}

                {opType === 'scale' && (
                  <span className="font-mono-tabular text-slate-300">· R{targetRow + 1}</span>
                )}

                <button
                  type="button"
                  onClick={applyCustomOperation}
                  className="ml-auto rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 whitespace-nowrap shrink-0"
                >
                  Apply
                </button>
              </div>

              {opError && <p className="text-xs text-amber-300">{opError}</p>}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
