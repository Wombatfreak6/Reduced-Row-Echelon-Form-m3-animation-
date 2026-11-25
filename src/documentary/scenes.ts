import { WORKED_STEPS, Fraction } from '../math/fraction';
import {
  PALETTE,
  clamp01,
  subProgress,
  easeInOutCubic,
  easeOutCubic,
  easeOutBack,
  lerp,
  drawCosmicBackdrop,
  drawSceneHeader,
  drawBadge,
  drawMatrix,
  drawMathValue,
  drawStaircase,
  draw3DPlanesInvariance,
  roundRectPath,
} from './canvasUtils';

const OPENING_MATRIX = [
  ['2', '1', '-1', '8'],
  ['-3', '-1', '2', '-11'],
  ['-2', '1', '2', '-3'],
];

/**
 * Helper to crossfade an entire matrix transition smoothly while flashing changed cells in cyan/purple.
 */
function drawMorphingMatrix(
  ctx: CanvasRenderingContext2D,
  prevGrid: Array<Array<string | Fraction>>,
  nextGrid: Array<Array<string | Fraction>>,
  cx: number,
  cy: number,
  morphProgress: number,
  opts: {
    cellW?: number;
    cellH?: number;
    fontSize?: number;
    alpha?: number;
    rowAlphas?: number[];
    rowHighlights?: Array<{ row: number; color: string; alpha?: number }>;
    pivots?: Array<{ row: number; col: number }>;
    changeColor?: string;
    colHeaders?: string[];
    colHeaderColors?: string[];
    colHeaderAlpha?: number;
    augmented?: boolean;
  } = {},
) {
  const p = easeInOutCubic(morphProgress);
  const rows = prevGrid.length;
  const cols = prevGrid[0].length;
  const cellW = opts.cellW ?? 140;
  const cellH = opts.cellH ?? 104;
  const fontSize = opts.fontSize ?? 46;
  const alpha = opts.alpha ?? 1;
  const augmented = opts.augmented ?? true;
  const changeColor = opts.changeColor ?? PALETTE.cyanPivot;

  const pivotSet = new Set((opts.pivots ?? []).map((pt) => `${pt.row},${pt.col}`));
  const changed = new Set<string>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (String(prevGrid[r][c]) !== String(nextGrid[r][c])) {
        changed.add(`${r},${c}`);
      }
    }
  }

  // Draw base frame, brackets, headers, and static cells
  const baseCellAlphas: Record<string, number> = {};
  const baseCellColors: Record<string, string> = {};
  const baseCellGlows: Record<string, number> = {};

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = `${r},${c}`;
      if (changed.has(k)) {
        baseCellAlphas[k] = 0;
      } else {
        baseCellAlphas[k] = 1;
        if (pivotSet.has(k)) {
          baseCellColors[k] = PALETTE.cyanPivot;
          baseCellGlows[k] = 10;
        }
      }
    }
  }

  const geom = drawMatrix(ctx, prevGrid, {
    cx,
    cy,
    cellW,
    cellH,
    fontSize,
    alpha,
    augmented,
    rowAlphas: opts.rowAlphas,
    rowHighlights: opts.rowHighlights,
    cellAlphas: baseCellAlphas,
    cellColors: baseCellColors,
    cellGlows: baseCellGlows,
    colHeaders: opts.colHeaders,
    colHeaderColors: opts.colHeaderColors,
    colHeaderAlpha: opts.colHeaderAlpha,
  });

  // Draw smoothly morphing changed cells
  for (const k of changed) {
    const [r, c] = k.split(',').map(Number);
    const pos = geom.getCellCenter(r, c);
    const rAlpha = opts.rowAlphas?.[r] ?? 1;

    // Outgoing old value
    if (p < 0.65) {
      const outA = alpha * rAlpha * (1 - p / 0.65);
      const outScale = 1 - 0.25 * (p / 0.65);
      ctx.save();
      ctx.translate(pos.x, pos.y - 10 * (p / 0.65));
      ctx.scale(outScale, outScale);
      drawMathValue(ctx, prevGrid[r][c], 0, 0, fontSize, PALETTE.softWhite, outA);
      ctx.restore();
    }

    // Incoming new value with subtle highlight pulse
    if (p > 0.25) {
      const inP = clamp01((p - 0.25) / 0.75);
      const inScale = lerp(0.75, 1.0, easeOutBack(inP));
      const pulse = Math.sin(inP * Math.PI);
      const col = pivotSet.has(k) ? PALETTE.cyanPivot : pulse > 0.2 ? changeColor : PALETTE.softWhite;
      ctx.save();
      ctx.translate(pos.x, pos.y + 10 * (1 - inP));
      ctx.scale(inScale, inScale);
      drawMathValue(ctx, nextGrid[r][c], 0, 0, fontSize, col, alpha * rAlpha * inP, pulse * 14);
      ctx.restore();
    }
  }

  return geom;
}

// ============================================================================
// SCENE 1 — THE MYSTERY OF LINEAR SYSTEMS (00:00 – 00:40)
// ============================================================================
function renderScene1(ctx: CanvasRenderingContext2D, t: number) {
  const fadeOutScene = 1 - subProgress(t, 38.0, 40.0);
  if (fadeOutScene <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = fadeOutScene;

  // Subtle 3D planes hint behind scene (0–28s)
  const planesAlpha =
    easeInOutCubic(subProgress(t, 1.5, 5.0)) * (1 - subProgress(t, 26, 30)) * 0.42;
  draw3DPlanesInvariance(ctx, 960, 540, 260, 0.45 + t * 0.05, planesAlpha, t * 0.03);

  // 00:00 – 00:09: Glowing x, y, z symbols
  const varIn = easeOutCubic(subProgress(t, 0.8, 3.5));
  const varOut = 1 - easeInOutCubic(subProgress(t, 7.5, 9.5));
  const varAlpha = varIn * varOut;
  if (varAlpha > 0.01) {
    const vars = [
      { sym: 'x', x: 640, y: 490 + 14 * Math.sin(t * 1.1), col: PALETTE.cyanPivot, delay: 0 },
      { sym: 'y', x: 960, y: 550 + 14 * Math.cos(t * 0.9), col: PALETTE.electricBlue, delay: 0.5 },
      { sym: 'z', x: 1280, y: 480 + 14 * Math.sin(t * 1.0 + 1.5), col: PALETTE.purpleAccent, delay: 1.0 },
    ];
    for (const v of vars) {
      const a = easeOutCubic(subProgress(t, 0.8 + v.delay, 2.8 + v.delay)) * varOut;
      ctx.save();
      ctx.globalAlpha = a * fadeOutScene;
      ctx.font = 'italic 700 112px "STIX Two Text", Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = v.col;
      ctx.shadowColor = v.col;
      ctx.shadowBlur = 32;
      ctx.fillText(v.sym, v.x, v.y);
      ctx.restore();
    }

    const capAlpha = easeOutCubic(subProgress(t, 3.4, 5.2)) * varOut;
    ctx.save();
    ctx.globalAlpha = capAlpha * fadeOutScene;
    ctx.font = '400 30px "DM Sans", sans-serif';
    ctx.fillStyle = PALETTE.mutedSlate;
    ctx.textAlign = 'center';
    ctx.fillText('Three unknowns. Intertwined constraints.', 960, 740);
    ctx.restore();
  }

  // 00:08 – 00:22: Equations float in and align into braced system
  const eqOut = 1 - easeInOutCubic(subProgress(t, 20.5, 22.8));
  if (t >= 7.5 && eqOut > 0.01) {
    const alignP = easeInOutCubic(subProgress(t, 12.5, 16.0));
    const shiftDown = easeInOutCubic(subProgress(t, 18.0, 20.0)) * 55;
    const eqDefs = [
      {
        tokens: [
          { txt: '2', col: PALETTE.softWhite },
          { txt: 'x', col: PALETTE.cyanPivot, italic: true },
          { txt: ' + ', col: PALETTE.mutedSlate },
          { txt: 'y', col: PALETTE.electricBlue, italic: true },
          { txt: ' − ', col: PALETTE.mutedSlate },
          { txt: 'z', col: PALETTE.purpleAccent, italic: true },
          { txt: ' = 8', col: PALETTE.softWhite },
        ],
        sx: 610,
        sy: 310,
        tx: 960,
        ty: 420 + shiftDown,
        tStart: 8.2,
      },
      {
        tokens: [
          { txt: '−3', col: PALETTE.softWhite },
          { txt: 'x', col: PALETTE.cyanPivot, italic: true },
          { txt: ' − ', col: PALETTE.mutedSlate },
          { txt: 'y', col: PALETTE.electricBlue, italic: true },
          { txt: ' + 2', col: PALETTE.softWhite },
          { txt: 'z', col: PALETTE.purpleAccent, italic: true },
          { txt: ' = −11', col: PALETTE.softWhite },
        ],
        sx: 1270,
        sy: 540,
        tx: 960,
        ty: 530 + shiftDown,
        tStart: 9.6,
      },
      {
        tokens: [
          { txt: '−2', col: PALETTE.softWhite },
          { txt: 'x', col: PALETTE.cyanPivot, italic: true },
          { txt: ' + ', col: PALETTE.mutedSlate },
          { txt: 'y', col: PALETTE.electricBlue, italic: true },
          { txt: ' + 2', col: PALETTE.softWhite },
          { txt: 'z', col: PALETTE.purpleAccent, italic: true },
          { txt: ' = −3', col: PALETTE.softWhite },
        ],
        sx: 680,
        sy: 760,
        tx: 960,
        ty: 640 + shiftDown,
        tStart: 11.0,
      },
    ];

    for (const eq of eqDefs) {
      const inA = easeOutCubic(subProgress(t, eq.tStart, eq.tStart + 1.4));
      const a = inA * eqOut * fadeOutScene;
      if (a <= 0.01) continue;
      const cx = lerp(eq.sx, eq.tx, alignP);
      const cy = lerp(eq.sy, eq.ty, alignP);
      drawColoredTokens(ctx, eq.tokens, cx, cy, 52, a);
    }

    // Left curly brace after alignment
    const braceA = easeOutCubic(subProgress(t, 15.6, 17.0)) * eqOut * fadeOutScene;
    if (braceA > 0.01) {
      ctx.save();
      ctx.globalAlpha = braceA;
      ctx.font = '300 290px "STIX Two Text", Georgia, serif';
      ctx.fillStyle = PALETTE.electricBlue;
      ctx.shadowColor = PALETTE.electricBlue;
      ctx.shadowBlur = 14;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('{', 680, 528 + shiftDown);
      ctx.restore();
    }
  }

  // 00:18 – 00:29: Central Question
  const qIn = easeOutCubic(subProgress(t, 18.0, 20.5));
  const qOut = 1 - easeInOutCubic(subProgress(t, 28.0, 30.0));
  if (qIn * qOut > 0.01) {
    ctx.save();
    ctx.globalAlpha = qIn * qOut * fadeOutScene;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 34px "DM Sans", sans-serif';
    ctx.fillStyle = PALETTE.softWhite;
    ctx.fillText('How can we systematically solve a system of equations', 960, 165);
    ctx.fillStyle = PALETTE.cyanPivot;
    ctx.fillText('without getting lost in complicated algebra?', 960, 215);
    ctx.restore();
  }

  // 00:21 – 00:40: Glowing Augmented Matrix emerges & moves down for Title Card
  const matIn = easeInOutCubic(subProgress(t, 21.5, 24.5));
  if (matIn > 0.01) {
    const titlePhase = easeInOutCubic(subProgress(t, 28.5, 31.2));
    const matY = lerp(575, 735, titlePhase);
    const matScale = lerp(1.04, 0.86, titlePhase);

    ctx.save();
    ctx.translate(960, matY);
    ctx.scale(matScale, matScale);
    drawMatrix(ctx, OPENING_MATRIX, {
      cx: 0,
      cy: 0,
      cellW: 138,
      cellH: 102,
      fontSize: 48,
      alpha: matIn * fadeOutScene,
      bracketColor: PALETTE.cyanPivot,
      dividerColor: PALETTE.cyanPivot,
    });
    ctx.restore();

    // Subtle glowing frame before title reveal
    const glowFrameA = easeOutCubic(subProgress(t, 24.5, 26.0)) * (1 - titlePhase);
    if (glowFrameA > 0.01) {
      ctx.save();
      ctx.globalAlpha = glowFrameA * 0.55 * fadeOutScene;
      ctx.strokeStyle = PALETTE.cyanPivot;
      ctx.shadowColor = PALETTE.cyanPivot;
      ctx.shadowBlur = 24;
      ctx.lineWidth = 2;
      roundRectPath(ctx, 960 - 340, matY - 195, 680, 390, 18);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 00:29 – 00:40: Title Reveal
  const titleIn = easeOutCubic(subProgress(t, 29.5, 32.0));
  if (titleIn > 0.01) {
    ctx.save();
    ctx.globalAlpha = titleIn * fadeOutScene;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '700 72px "Outfit", sans-serif';
    ctx.fillStyle = PALETTE.softWhite;
    ctx.shadowColor = PALETTE.electricBlue;
    ctx.shadowBlur = 28;
    ctx.fillText('REDUCED ROW ECHELON FORM', 960, 265);

    ctx.shadowBlur = 12;
    ctx.strokeStyle = PALETTE.cyanPivot;
    ctx.lineWidth = 3;
    const lineHalf = 460 * easeOutCubic(subProgress(t, 30.2, 32.2));
    ctx.beginPath();
    ctx.moveTo(960 - lineHalf, 330);
    ctx.lineTo(960 + lineHalf, 330);
    ctx.stroke();

    const subA = easeOutCubic(subProgress(t, 31.4, 33.4));
    ctx.globalAlpha = subA * fadeOutScene;
    ctx.shadowBlur = 0;
    ctx.font = 'italic 500 34px "STIX Two Text", Georgia, serif';
    ctx.fillStyle = PALETTE.cyanPivot;
    ctx.fillText('How Matrices Reveal the Solutions to Linear Systems', 960, 385);
    ctx.restore();
  }

  ctx.restore();
}

function drawColoredTokens(
  ctx: CanvasRenderingContext2D,
  tokens: Array<{ txt: string; col: string; italic?: boolean }>,
  cx: number,
  cy: number,
  fontSize: number,
  alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  let totalW = 0;
  const widths: number[] = [];
  for (const tk of tokens) {
    ctx.font = `${tk.italic ? 'italic ' : ''}600 ${fontSize}px "STIX Two Text", Georgia, serif`;
    const w = ctx.measureText(tk.txt).width;
    widths.push(w);
    totalW += w;
  }

  let x = cx - totalW / 2;
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    ctx.font = `${tk.italic ? 'italic ' : ''}600 ${fontSize}px "STIX Two Text", Georgia, serif`;
    ctx.fillStyle = tk.col;
    ctx.fillText(tk.txt, x, cy);
    x += widths[i];
  }
  ctx.restore();
}

// ============================================================================
// SCENE 2 — UNDERSTANDING MATRICES AND PIVOTS (00:40 – 01:25)
// ============================================================================
function renderScene2(ctx: CanvasRenderingContext2D, t: number) {
  const lt = t - 40; // local time 0..45s
  const fadeIn = easeOutCubic(subProgress(lt, 0, 1.4));
  const fadeOut = 1 - easeInOutCubic(subProgress(lt, 43.2, 45.0));
  const sceneAlpha = fadeIn * fadeOut;
  if (sceneAlpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = sceneAlpha;
  drawSceneHeader(ctx, '01  |  MATRICES & PIVOTS', 'Anatomy of an Augmented Matrix', sceneAlpha);

  // Part A (0 – 22s): Equations -> Augmented Matrix + Rows / Columns / Pivots
  const partAOut = 1 - easeInOutCubic(subProgress(lt, 21.0, 23.0));
  if (partAOut > 0.01) {
    const eqOut = 1 - easeInOutCubic(subProgress(lt, 10.0, 11.8));
    const matCenterSlide = easeInOutCubic(subProgress(lt, 10.5, 12.5));
    const matX = lerp(1280, 960, matCenterSlide);
    const matY = lerp(540, 510, matCenterSlide);

    // Equations on left
    if (eqOut > 0.01) {
      const eqTexts = [
        '2x + y − z = 8',
        '−3x − y + 2z = −11',
        '−2x + y + 2z = −3',
      ];
      eqTexts.forEach((txt, i) => {
        const a = easeOutCubic(subProgress(lt, 1.0 + i * 0.7, 2.2 + i * 0.7)) * eqOut * partAOut;
        ctx.save();
        ctx.globalAlpha = a * sceneAlpha;
        ctx.font = '600 40px "STIX Two Text", Georgia, serif';
        ctx.fillStyle = PALETTE.softWhite;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, 690, 435 + i * 105);
        ctx.restore();

        // Mapping arrow into matrix row
        const arrA =
          easeOutCubic(subProgress(lt, 3.4 + i * 1.4, 4.4 + i * 1.4)) *
          (1 - subProgress(lt, 9.2, 10.5)) *
          partAOut;
        if (arrA > 0.01) {
          ctx.save();
          ctx.globalAlpha = arrA * sceneAlpha;
          ctx.strokeStyle = PALETTE.cyanPivot;
          ctx.fillStyle = PALETTE.cyanPivot;
          ctx.lineWidth = 3;
          const y = 435 + i * 105;
          ctx.beginPath();
          ctx.moveTo(725, y);
          ctx.lineTo(935, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(945, y);
          ctx.lineTo(927, y - 9);
          ctx.lineTo(927, y + 9);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });
    }

    // Row alphas reveal progressively from arrows
    const rAlphas = [0, 1, 2].map((i) => easeOutCubic(subProgress(lt, 3.8 + i * 1.4, 5.0 + i * 1.4)));
    const rowHl: Array<{ row: number; color: string; alpha?: number }> = [];
    const colHl: Array<{ col: number; color: string; alpha?: number }> = [];
    const cellHl: Array<{ row: number; col: number; color: string; alpha?: number }> = [];
    const cellCols: Record<string, string> = {};

    // Row 1 highlight (12.5 – 14.8s)
    const rHlA = easeOutCubic(subProgress(lt, 12.5, 13.3)) * (1 - subProgress(lt, 14.3, 15.0));
    if (rHlA > 0.01) rowHl.push({ row: 0, color: PALETTE.electricBlue, alpha: rHlA });

    // Column 1 highlight (15.0 – 17.2s)
    const cHlA = easeOutCubic(subProgress(lt, 15.0, 15.7)) * (1 - subProgress(lt, 16.7, 17.4));
    if (cHlA > 0.01) colHl.push({ col: 0, color: PALETTE.purpleAccent, alpha: cHlA });

    // Leading entry / pivot highlights (17.5 – 21.5s)
    for (let r = 0; r < 3; r++) {
      const pA = easeOutCubic(subProgress(lt, 17.4 + r * 0.7, 18.2 + r * 0.7));
      if (pA > 0.01) {
        cellHl.push({ row: r, col: 0, color: PALETTE.cyanPivot, alpha: pA });
        cellCols[`${r},0`] = PALETTE.cyanPivot;
      }
    }

    drawMatrix(ctx, OPENING_MATRIX, {
      cx: matX,
      cy: matY,
      cellW: 132,
      cellH: 105,
      fontSize: 46,
      alpha: partAOut,
      rowAlphas: rAlphas,
      colHeaders: ['x', 'y', 'z', 'b'],
      colHeaderColors: [PALETTE.cyanPivot, PALETTE.electricBlue, PALETTE.purpleAccent, PALETTE.softWhite],
      colHeaderAlpha: easeOutCubic(subProgress(lt, 7.6, 8.8)),
      rowHighlights: rowHl,
      colHighlights: colHl,
      cellHighlights: cellHl,
      cellColors: cellCols,
    });

    // Bottom callouts for Row / Col / Pivot
    if (rHlA > 0.01) {
      drawBadge(ctx, 'Row 1  (Equation 1)', 960, 775, PALETTE.electricBlue, rHlA * partAOut, 26);
    }
    if (cHlA > 0.01) {
      drawBadge(ctx, 'Column 1  (Coefficients of x)', 960, 775, PALETTE.purpleAccent, cHlA * partAOut, 26);
    }
    const pivNoteA = easeOutCubic(subProgress(lt, 17.3, 18.2)) * partAOut;
    if (pivNoteA > 0.01) {
      drawBadge(
        ctx,
        'Pivot (Leading Entry): First nonzero entry from the left in each row',
        960,
        785,
        PALETTE.cyanPivot,
        pivNoteA,
        26,
      );
    }
  }

  // Part B (23 – 45s): REF Rules + Arbitrary Matrix -> REF Staircase
  const partBIn = easeOutCubic(subProgress(lt, 22.8, 24.4));
  if (partBIn > 0.01) {
    ctx.save();
    ctx.globalAlpha = partBIn * sceneAlpha;

    // Left: REF rules
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 38px "Outfit", sans-serif';
    ctx.fillStyle = PALETTE.cyanPivot;
    ctx.fillText('Row Echelon Form (REF)', 130, 255);

    const rules = [
      '1. All zero rows sit at the bottom.',
      '2. Each leading entry lies strictly to the right\n    of the leading entry above it.',
      '3. All entries below every pivot are zero.',
    ];
    rules.forEach((rule, idx) => {
      const ra = easeOutCubic(subProgress(lt, 23.5 + idx * 1.2, 24.8 + idx * 1.2));
      ctx.save();
      ctx.globalAlpha = ra * partBIn * sceneAlpha;
      ctx.font = '400 27px "DM Sans", sans-serif';
      ctx.fillStyle = PALETTE.softWhite;
      const lines = rule.split('\n');
      const baseY = 345 + idx * 125;
      lines.forEach((ln, li) => ctx.fillText(ln, 130, baseY + li * 38));
      ctx.restore();
    });

    // Right: Arbitrary 4x4 matrix -> zero row to bottom -> clear below pivot 2 -> staircase
    const arb0 = [
      ['0', '0', '0', '0'],
      ['2', '4', '-2', '6'],
      ['0', '3', '1', '5'],
      ['0', '6', '5', '16'],
    ];
    const arb1 = [
      ['2', '4', '-2', '6'],
      ['0', '3', '1', '5'],
      ['0', '6', '5', '16'],
      ['0', '0', '0', '0'],
    ];
    const arb2 = [
      ['2', '4', '-2', '6'],
      ['0', '3', '1', '5'],
      ['0', '0', '3', '6'],
      ['0', '0', '0', '0'],
    ];

    const matCX = 1360;
    const matCY = 520;
    const step1P = subProgress(lt, 28.0, 31.2);
    const step2P = subProgress(lt, 33.2, 36.4);

    let geom;
    if (lt < 32.2) {
      // Animate zero row sliding from row 0 to row 3 while rows 1..3 shift up
      const p = easeInOutCubic(step1P);
      const rowOffsets = [
        { dx: 0, dy: p * 3 * 92 },
        { dx: 0, dy: -p * 92 },
        { dx: 0, dy: -p * 92 },
        { dx: 0, dy: -p * 92 },
      ];
      const cellCols: Record<string, string> = {};
      for (let c = 0; c < 4; c++) cellCols[`0,${c}`] = PALETTE.amberOp;
      geom = drawMatrix(ctx, arb0, {
        cx: matCX,
        cy: matCY,
        cellW: 112,
        cellH: 92,
        fontSize: 40,
        augmented: false,
        alpha: partBIn,
        rowOffsets,
        cellColors: cellCols,
        rowHighlights: step1P > 0.02 && step1P < 0.98 ? [{ row: 0, color: PALETTE.amberOp, alpha: 0.9 }] : [],
      });
    } else {
      const p2 = easeInOutCubic(step2P);
      geom = drawMorphingMatrix(ctx, arb1, arb2, matCX, matCY, p2, {
        cellW: 112,
        cellH: 92,
        fontSize: 40,
        augmented: false,
        alpha: partBIn,
        rowAlphas: [1, 1, 1, 0.45],
        pivots: [
          { row: 0, col: 0 },
          { row: 1, col: 1 },
          { row: 2, col: 2 },
        ],
      });
    }

    // Operation annotations under right matrix
    const note1A = easeOutCubic(subProgress(lt, 27.5, 28.4)) * (1 - subProgress(lt, 32.0, 33.0));
    if (note1A > 0.01) {
      drawBadge(ctx, 'Move all-zero row to the bottom', matCX, 795, PALETTE.amberOp, note1A, 24);
    }
    const note2A = easeOutCubic(subProgress(lt, 33.0, 33.8)) * (1 - subProgress(lt, 37.2, 38.0));
    if (note2A > 0.01) {
      drawBadge(ctx, 'Clear entry below pivot  (R₃ → R₃ − 2R₂)', matCX, 795, PALETTE.cyanPivot, note2A, 24);
    }

    // Glowing staircase trace (36.8 – 43.5s)
    const stairP = easeInOutCubic(subProgress(lt, 36.8, 39.8));
    if (stairP > 0.01) {
      drawStaircase(
        ctx,
        geom,
        [
          { row: 0, col: 0 },
          { row: 1, col: 1 },
          { row: 2, col: 2 },
        ],
        4,
        stairP,
        PALETTE.cyanPivot,
        partBIn,
      );
      const stairLblA = easeOutCubic(subProgress(lt, 37.6, 39.0));
      drawBadge(ctx, 'Staircase Pattern  (Row Echelon Form)', matCX, 795, PALETTE.cyanPivot, stairLblA, 25);
    }

    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// SCENE 3 — THE THREE ELEMENTARY ROW OPERATIONS (01:25 – 02:15)
// ============================================================================
function renderScene3(ctx: CanvasRenderingContext2D, t: number) {
  const lt = t - 85; // local time 0..50s
  const fadeIn = easeOutCubic(subProgress(lt, 0, 1.3));
  const fadeOut = 1 - easeInOutCubic(subProgress(lt, 48.2, 50.0));
  const sceneAlpha = fadeIn * fadeOut;
  if (sceneAlpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = sceneAlpha;
  drawSceneHeader(
    ctx,
    '02  |  THE THREE ELEMENTARY ROW OPERATIONS',
    'Transforming Matrices Without Changing the Solution Set',
    sceneAlpha,
  );

  // --------------------------------------------------------------------------
  // OP 1 (0 – 14s): Row Swapping  R1 <-> R2
  // --------------------------------------------------------------------------
  if (lt < 14.5) {
    const opA = easeOutCubic(subProgress(lt, 0.3, 1.4)) * (1 - subProgress(lt, 12.8, 14.2));
    drawBadge(ctx, '1. Row Swapping:   R₁ ↔ R₂', 960, 215, PALETTE.cyanPivot, opA, 32);

    const swapP = easeInOutCubic(subProgress(lt, 4.2, 8.6));
    const arcX = Math.sin(swapP * Math.PI) * 95;
    const rowH = 108;
    const dimA = lerp(1, 0.25, easeOutCubic(subProgress(lt, 2.2, 3.6)));
    const hlA = easeOutCubic(subProgress(lt, 2.2, 3.4)) * (1 - subProgress(lt, 11.5, 12.8));

    drawMatrix(ctx, OPENING_MATRIX, {
      cx: 960,
      cy: 530,
      cellW: 136,
      cellH: rowH,
      fontSize: 48,
      alpha: opA,
      rowAlphas: [1, 1, dimA],
      rowOffsets: [
        { dx: -arcX, dy: swapP * rowH },
        { dx: arcX, dy: -swapP * rowH },
        { dx: 0, dy: 0 },
      ],
      rowHighlights: [
        { row: 0, color: PALETTE.cyanPivot, alpha: hlA },
        { row: 1, color: PALETTE.purpleAccent, alpha: hlA },
      ],
    });

    const noteA = easeOutCubic(subProgress(lt, 3.0, 4.2)) * opA;
    ctx.save();
    ctx.globalAlpha = noteA * sceneAlpha;
    ctx.font = '400 28px "DM Sans", sans-serif';
    ctx.fillStyle = PALETTE.mutedSlate;
    ctx.textAlign = 'center';
    ctx.fillText('Exchanging two rows swaps the order of the equations.', 960, 815);
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // OP 2 (14 – 29s): Row Scaling  R1 -> (1/2) R1
  // --------------------------------------------------------------------------
  if (lt >= 13.8 && lt < 29.5) {
    const opA = easeOutCubic(subProgress(lt, 14.0, 15.3)) * (1 - subProgress(lt, 27.6, 29.2));
    drawBadge(ctx, '2. Row Scaling:   R₁ → (1/2) R₁', 960, 215, PALETTE.electricBlue, opA, 32);

    const r1Before = ['2', '1', '-1', '8'];
    const r1After = ['1', '1/2', '-1/2', '4'];
    const dimA = lerp(1, 0.25, easeOutCubic(subProgress(lt, 15.6, 17.0)));
    const hlA = easeOutCubic(subProgress(lt, 15.6, 16.8)) * (1 - subProgress(lt, 26.2, 27.5));

    // Draw base matrix with Row 1 blanked (we draw Row 1 cells with column-by-column scaling)
    const geom = drawMatrix(ctx, OPENING_MATRIX, {
      cx: 960,
      cy: 530,
      cellW: 136,
      cellH: 108,
      fontSize: 48,
      alpha: opA,
      rowAlphas: [1, dimA, dimA],
      cellAlphas: { '0,0': 0, '0,1': 0, '0,2': 0, '0,3': 0 },
      rowHighlights: [{ row: 0, color: PALETTE.electricBlue, alpha: hlA }],
    });

    for (let c = 0; c < 4; c++) {
      const pos = geom.getCellCenter(0, c);
      const cellP = subProgress(lt, 17.5 + c * 1.9, 19.2 + c * 1.9);
      const tagA = Math.sin(clamp01(cellP) * Math.PI);

      if (tagA > 0.02) {
        drawBadge(ctx, '× 1/2', pos.x, pos.y - 88, PALETTE.cyanPivot, tagA * opA, 22, 92);
      }

      if (cellP < 0.5) {
        drawMathValue(ctx, r1Before[c], pos.x, pos.y, 48, PALETTE.softWhite, opA * (1 - cellP * 1.8));
      } else {
        const inP = clamp01((cellP - 0.5) * 2);
        const sc = lerp(0.75, 1.0, easeOutBack(inP));
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.scale(sc, sc);
        drawMathValue(ctx, r1After[c], 0, 0, 48, PALETTE.cyanPivot, opA * inP, 12 * (1 - inP * 0.5));
        ctx.restore();
      }
    }

    const noteA = easeOutCubic(subProgress(lt, 16.2, 17.5)) * opA;
    ctx.save();
    ctx.globalAlpha = noteA * sceneAlpha;
    ctx.font = '400 28px "DM Sans", sans-serif';
    ctx.fillStyle = PALETTE.mutedSlate;
    ctx.textAlign = 'center';
    ctx.fillText('Every entry in Row 1 is multiplied by the same nonzero constant (c ≠ 0).', 960, 815);
    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // OP 3 (29 – 45s): Row Replacement  R2 -> R2 + 3 R1 (column-by-column)
  // --------------------------------------------------------------------------
  if (lt >= 28.8 && lt < 46.2) {
    const opA = easeOutCubic(subProgress(lt, 29.0, 30.2)) * (1 - subProgress(lt, 44.6, 46.0));
    drawBadge(ctx, '3. Row Replacement:   R₂ → R₂ + 3 R₁', 960, 210, PALETTE.purpleAccent, opA, 32);

    const gridStart = [
      ['1', '1/2', '-1/2', '4'],
      ['-3', '-1', '2', '-11'],
      ['-2', '1', '2', '-3'],
    ];
    const r2After = ['0', '1/2', '1/2', '1'];
    const formulas = [
      'Column 1:   −3 + 3(1) = 0',
      'Column 2:   −1 + 3(1/2) = 1/2',
      'Column 3:    2 + 3(−1/2) = 1/2',
      'Column 4:   −11 + 3(4) = 1',
    ];

    const dimA = lerp(1, 0.24, easeOutCubic(subProgress(lt, 30.2, 31.2)));
    const hlA = easeOutCubic(subProgress(lt, 30.2, 31.2)) * (1 - subProgress(lt, 43.8, 45.0));

    const colHl: Array<{ col: number; color: string; alpha?: number }> = [];
    let activeCol = -1;
    let activeColP = 0;
    for (let c = 0; c < 4; c++) {
      const s = 32.0 + c * 2.8;
      const e = s + 2.6;
      if (lt >= s && lt <= e) {
        activeCol = c;
        activeColP = (lt - s) / (e - s);
        colHl.push({ col: c, color: PALETTE.cyanPivot, alpha: Math.sin(activeColP * Math.PI) });
      }
    }

    const geom = drawMatrix(ctx, gridStart, {
      cx: 960,
      cy: 485,
      cellW: 136,
      cellH: 102,
      fontSize: 46,
      alpha: opA,
      rowAlphas: [1, 1, dimA],
      cellAlphas: { '1,0': 0, '1,1': 0, '1,2': 0, '1,3': 0 },
      rowHighlights: [
        { row: 0, color: PALETTE.electricBlue, alpha: hlA },
        { row: 1, color: PALETTE.purpleAccent, alpha: hlA },
      ],
      colHighlights: colHl,
    });

    // Render Row 2 cells transitioning column by column
    for (let c = 0; c < 4; c++) {
      const pos = geom.getCellCenter(1, c);
      const cp = subProgress(lt, 32.6 + c * 2.8, 34.4 + c * 2.8);
      if (cp < 0.5) {
        drawMathValue(ctx, gridStart[1][c], pos.x, pos.y, 46, PALETTE.softWhite, opA * (1 - cp * 1.8));
      } else {
        const inP = clamp01((cp - 0.5) * 2);
        drawMathValue(
          ctx,
          r2After[c],
          pos.x,
          pos.y,
          46,
          inP < 1 ? PALETTE.cyanPivot : PALETTE.softWhite,
          opA * inP,
          12 * (1 - inP * 0.5),
        );
      }
    }

    // Live formula calculation panel below matrix
    if (activeCol >= 0) {
      const fAlpha = Math.sin(activeColP * Math.PI) * opA;
      drawBadge(ctx, formulas[activeCol], 960, 770, PALETTE.purpleAccent, fAlpha, 30, 520);
    }
  }

  // --------------------------------------------------------------------------
  // Invariance Finale (44.5 – 50s): Solution Set Preserved
  // --------------------------------------------------------------------------
  if (lt >= 44.2) {
    const invA = easeOutCubic(subProgress(lt, 44.4, 45.8));
    draw3DPlanesInvariance(ctx, 960, 480, 235, 0.6 + lt * 0.12, invA, lt * 0.25);
    drawBadge(
      ctx,
      'Elementary row operations preserve the exact solution set.',
      960,
      815,
      PALETTE.successTeal,
      invA,
      30,
    );
  }

  ctx.restore();
}

// ============================================================================
// SCENE 4 — FROM REF TO RREF (02:15 – 03:00)
// ============================================================================
function renderScene4(ctx: CanvasRenderingContext2D, t: number) {
  const lt = t - 135; // local time 0..45s
  const fadeIn = easeOutCubic(subProgress(lt, 0, 1.3));
  const fadeOut = 1 - easeInOutCubic(subProgress(lt, 43.2, 45.0));
  const sceneAlpha = fadeIn * fadeOut;
  if (sceneAlpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = sceneAlpha;
  drawSceneHeader(ctx, '03  |  FROM REF TO RREF', 'Completing the Structure & Uniqueness', sceneAlpha);

  // Pipeline diagram across top
  const pipeSteps = [
    { label: 'REF', col: PALETTE.electricBlue, activeAt: 0 },
    { label: 'Normalize Pivots', col: PALETTE.cyanPivot, activeAt: 10 },
    { label: 'Eliminate Above Pivots', col: PALETTE.purpleAccent, activeAt: 21 },
    { label: 'RREF', col: PALETTE.successTeal, activeAt: 35 },
  ];

  const pipeX = [350, 705, 1140, 1545];
  const pipeY = 205;
  for (let i = 0; i < pipeSteps.length; i++) {
    const st = pipeSteps[i];
    const inA = easeOutCubic(subProgress(lt, 0.8 + i * 0.45, 1.8 + i * 0.45));
    const isActive = lt >= st.activeAt;
    drawBadge(
      ctx,
      st.label,
      pipeX[i],
      pipeY,
      isActive ? st.col : PALETTE.dimSlate,
      inA * (isActive ? 1 : 0.65),
      23,
      i === 2 ? 300 : 180,
    );
    if (i < pipeSteps.length - 1) {
      ctx.save();
      ctx.globalAlpha = inA * sceneAlpha;
      ctx.strokeStyle = PALETTE.dimSlate;
      ctx.lineWidth = 2.5;
      const x1 = pipeX[i] + (i === 1 ? 128 : i === 2 ? 165 : 105);
      const x2 = pipeX[i + 1] - (i + 1 === 2 ? 165 : i + 1 === 1 ? 128 : 105);
      ctx.beginPath();
      ctx.moveTo(x1, pipeY);
      ctx.lineTo(x2, pipeY);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Side-by-side labels
  const sideA = easeOutCubic(subProgress(lt, 2.5, 4.0));
  ctx.save();
  ctx.globalAlpha = sideA * sceneAlpha;
  ctx.textAlign = 'center';
  ctx.font = '600 28px "Outfit", sans-serif';
  ctx.fillStyle = PALETTE.electricBlue;
  ctx.fillText('Row Echelon Form (REF)', 490, 335);
  ctx.fillStyle = PALETTE.successTeal;
  ctx.fillText('Reduced Row Echelon Form (RREF)', 1390, 335);
  ctx.restore();

  // Left REF matrix (fixed reference with staircase)
  const refGrid = [
    ['2', '4', '-2', '6'],
    ['0', '3', '6', '9'],
    ['0', '0', '2', '4'],
  ];
  const leftGeom = drawMatrix(ctx, refGrid, {
    cx: 490,
    cy: 550,
    cellW: 118,
    cellH: 96,
    fontSize: 42,
    alpha: sideA,
    cellColors: { '0,0': PALETTE.cyanPivot, '1,1': PALETTE.cyanPivot, '2,2': PALETTE.cyanPivot },
  });
  drawStaircase(
    ctx,
    leftGeom,
    [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 2 },
    ],
    4,
    easeOutCubic(subProgress(lt, 4.0, 6.2)),
    PALETTE.electricBlue,
    sideA,
  );

  // Right Matrix transforming REF -> Normalize Pivots -> Eliminate Above Col 3 -> Eliminate Above Col 2
  const normGrid = [
    ['1', '2', '-1', '3'],
    ['0', '1', '2', '3'],
    ['0', '0', '1', '2'],
  ];
  const elimCol3Grid = [
    ['1', '2', '0', '5'],
    ['0', '1', '0', '-1'],
    ['0', '0', '1', '2'],
  ];
  const rrefGrid = [
    ['1', '0', '0', '7'],
    ['0', '1', '0', '-1'],
    ['0', '0', '1', '2'],
  ];

  const pivots = [
    { row: 0, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 2 },
  ];

  let rightGeom;
  if (lt < 20.5) {
    const p = subProgress(lt, 10.5, 14.5);
    rightGeom = drawMorphingMatrix(ctx, refGrid, normGrid, 1390, 550, p, {
      cellW: 118,
      cellH: 96,
      fontSize: 42,
      alpha: sideA,
      pivots,
    });
  } else if (lt < 28.5) {
    const p = subProgress(lt, 21.5, 25.0);
    rightGeom = drawMorphingMatrix(ctx, normGrid, elimCol3Grid, 1390, 550, p, {
      cellW: 118,
      cellH: 96,
      fontSize: 42,
      alpha: sideA,
      pivots,
      changeColor: PALETTE.purpleAccent,
    });
  } else {
    const p = subProgress(lt, 29.0, 32.5);
    rightGeom = drawMorphingMatrix(ctx, elimCol3Grid, rrefGrid, 1390, 550, p, {
      cellW: 118,
      cellH: 96,
      fontSize: 42,
      alpha: sideA,
      pivots,
      changeColor: PALETTE.successTeal,
    });
  }

  // Highlight pivot columns in final RREF stage (35 – 44s)
  const colShow = easeOutCubic(subProgress(lt, 35.0, 37.5));
  if (colShow > 0.01) {
    for (let c = 0; c < 3; c++) {
      const ca = easeOutCubic(subProgress(lt, 35.0 + c * 0.6, 36.2 + c * 0.6));
      if (ca <= 0.01) continue;
      const cxCol = rightGeom.getCellCenter(0, c).x;
      ctx.save();
      ctx.globalAlpha = ca * sceneAlpha;
      ctx.strokeStyle = PALETTE.cyanPivot;
      ctx.shadowColor = PALETTE.cyanPivot;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.4;
      roundRectPath(ctx, cxCol - 44, rightGeom.top + 10, 88, rightGeom.bottom - rightGeom.top - 20, 10);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Step captions at bottom
  if (lt >= 10 && lt < 21) {
    const a = easeOutCubic(subProgress(lt, 10.0, 11.0)) * (1 - subProgress(lt, 19.5, 20.8));
    drawBadge(ctx, '1. Scale every leading entry (pivot) to 1', 960, 835, PALETTE.cyanPivot, a, 28);
  } else if (lt >= 21 && lt < 35) {
    const a = easeOutCubic(subProgress(lt, 21.0, 22.0)) * (1 - subProgress(lt, 33.6, 34.8));
    drawBadge(
      ctx,
      '2. Eliminate all entries above each pivot  (pivot columns have 1 at pivot, 0s elsewhere)',
      960,
      835,
      PALETTE.purpleAccent,
      a,
      27,
    );
  } else if (lt >= 35) {
    const a = easeOutCubic(subProgress(lt, 35.0, 36.4));
    drawBadge(
      ctx,
      'RREF is UNIQUE for every given matrix.',
      960,
      835,
      PALETTE.successTeal,
      a,
      30,
    );
  }

  ctx.restore();
}

// ============================================================================
// SCENE 5 — COMPLETE WORKED EXAMPLE (03:00 – 04:30 | 90.0s)
// ============================================================================
function renderScene5(ctx: CanvasRenderingContext2D, t: number) {
  const lt = t - 180; // local time 0..90s
  const fadeIn = easeOutCubic(subProgress(lt, 0, 1.3));
  const fadeOut = 1 - easeInOutCubic(subProgress(lt, 88.2, 90.0));
  const sceneAlpha = fadeIn * fadeOut;
  if (sceneAlpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = sceneAlpha;
  drawSceneHeader(ctx, '04  |  COMPLETE WORKED EXAMPLE', 'Step-by-Step Gauss-Jordan Elimination', sceneAlpha);

  // Determine current step index from WORKED_STEPS
  let activeIdx = 0;
  for (let i = 0; i < WORKED_STEPS.length; i++) {
    if (t >= WORKED_STEPS[i].startSec) activeIdx = i;
  }
  const currentStep = WORKED_STEPS[activeIdx];
  const prevStep = WORKED_STEPS[Math.max(0, activeIdx - 1)];

  // Phase badge top-right
  const phaseColor =
    currentStep.phase === 'Back Elimination'
      ? PALETTE.purpleAccent
      : currentStep.phase === 'Final RREF'
        ? PALETTE.successTeal
        : PALETTE.electricBlue;
  const phaseText =
    currentStep.phase === 'Back Elimination'
      ? 'Phase 2: Back Elimination (to RREF)'
      : currentStep.phase === 'Final RREF'
        ? 'Final RREF Reached'
        : currentStep.phase === 'REF'
          ? 'Row Echelon Form (REF) Reached'
          : 'Phase 1: Forward Elimination (to REF)';
  drawBadge(ctx, phaseText, 1525, 76, phaseColor, 1, 22, 420);

  // Step timeline indicator bar at top center-right
  const stepProgressText = `Step ${activeIdx} of 7`;
  ctx.save();
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.mutedSlate;
  ctx.textAlign = 'right';
  ctx.fillText(stepProgressText, 1285, 82);
  ctx.restore();

  // Left visual anchor: subtle Previous State ghost matrix when activeIdx >= 1 & t < 262
  const revealSolP = easeInOutCubic(subProgress(t, 262.0, 264.2));
  if (activeIdx >= 1 && revealSolP < 0.98) {
    const prevAlpha = (1 - revealSolP) * 0.52;
    ctx.save();
    ctx.globalAlpha = prevAlpha * sceneAlpha;
    ctx.font = '500 18px "DM Sans", sans-serif';
    ctx.fillStyle = PALETTE.mutedSlate;
    ctx.textAlign = 'center';
    ctx.fillText('PREVIOUS STATE', 300, 360);
    drawMatrix(ctx, prevStep.matrix, {
      cx: 300,
      cy: 505,
      cellW: 78,
      cellH: 66,
      fontSize: 27,
      alpha: 0.78,
      bracketColor: PALETTE.dimSlate,
      dividerColor: PALETTE.dimSlate,
    });

    // Connecting arrow to current matrix
    ctx.strokeStyle = PALETTE.dimSlate;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(500, 505);
    ctx.lineTo(595, 505);
    ctx.stroke();
    ctx.restore();
  }

  // Main Center Matrix (slides left at 262s to reveal final solution card)
  const mainCX = lerp(1040, 620, revealSolP);
  const mainCY = 505;
  const stepElapsed = t - currentStep.startSec;

  // Pivot coords by step
  const pivotsByStep: Array<Array<{ row: number; col: number }>> = [
    [], // 0
    [{ row: 0, col: 0 }], // 1
    [{ row: 0, col: 0 }], // 2
    [{ row: 0, col: 0 }, { row: 1, col: 1 }], // 3
    [{ row: 0, col: 0 }, { row: 1, col: 1 }], // 4
    [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }], // 5 (REF)
    [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }], // 6
    [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }], // 7 (RREF)
  ];

  // Affected rows per step
  const affectedRowsByStep: number[][] = [
    [],
    [0],
    [1, 2],
    [1],
    [2],
    [2],
    [0, 1],
    [0],
  ];

  let mainGeom;
  if (activeIdx === 0) {
    mainGeom = drawMatrix(ctx, currentStep.matrix, {
      cx: mainCX,
      cy: mainCY,
      cellW: 138,
      cellH: 108,
      fontSize: 48,
      colHeaders: ['x', 'y', 'z', 'b'],
      colHeaderColors: [PALETTE.cyanPivot, PALETTE.electricBlue, PALETTE.purpleAccent, PALETTE.softWhite],
    });
  } else {
    const morphP = subProgress(stepElapsed, 1.1, 4.3);
    const affected = affectedRowsByStep[activeIdx];
    const hlWindow = easeOutCubic(subProgress(stepElapsed, 0.2, 1.0)) * (1 - subProgress(stepElapsed, 4.6, 5.6));

    const rowAlphas = [0, 1, 2].map((r) =>
      affected.includes(r) ? 1 : lerp(1, 0.34, hlWindow),
    );
    const rowHl = affected.map((r) => ({
      row: r,
      color: phaseColor,
      alpha: hlWindow,
    }));

    mainGeom = drawMorphingMatrix(ctx, prevStep.matrix, currentStep.matrix, mainCX, mainCY, morphP, {
      cellW: 138,
      cellH: 108,
      fontSize: 48,
      rowAlphas,
      rowHighlights: rowHl,
      pivots: pivotsByStep[activeIdx],
      changeColor: phaseColor,
      colHeaders: ['x', 'y', 'z', 'b'],
      colHeaderColors: [PALETTE.cyanPivot, PALETTE.electricBlue, PALETTE.purpleAccent, PALETTE.softWhite],
    });

    // Operation callout badge below matrix
    if (revealSolP < 0.8) {
      const opBadgeA = easeOutCubic(subProgress(stepElapsed, 0.15, 0.9)) * (1 - revealSolP);
      drawBadge(
        ctx,
        `${currentStep.title}:   ${currentStep.operationLabel}`,
        mainCX,
        805,
        phaseColor,
        opBadgeA,
        29,
        620,
      );
    }

    // Celebrate REF staircase briefly at end of Step 5 (236 – 241s)
    if (activeIdx === 5 && t >= 235.5) {
      const refStairP = easeInOutCubic(subProgress(t, 235.5, 238.0));
      drawStaircase(ctx, mainGeom, pivotsByStep[5], 4, refStairP, PALETTE.cyanPivot, 0.95);
    }
  }

  // Final Solution Reveal Panel (262 – 270s)
  if (t >= 262.0) {
    const panelA = easeOutCubic(subProgress(t, 262.6, 264.0));
    ctx.save();
    ctx.globalAlpha = panelA * sceneAlpha;
    ctx.fillStyle = PALETTE.panelBg;
    ctx.strokeStyle = PALETTE.successTeal;
    ctx.shadowColor = PALETTE.successTeal;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, 1140, 305, 520, 410, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const sols = [
      { label: 'x  =  2', col: PALETTE.cyanPivot, row: 0, start: 263.8 },
      { label: 'y  =  3', col: PALETTE.electricBlue, row: 1, start: 265.2 },
      { label: 'z  =  −1', col: PALETTE.purpleAccent, row: 2, start: 266.6 },
    ];

    for (const s of sols) {
      const sA = easeOutCubic(subProgress(t, s.start, s.start + 1.0));
      if (sA <= 0.01) continue;

      // Highlight matching row in final RREF matrix
      const rowPulse =
        t >= s.start && t < s.start + 1.6
          ? Math.sin(((t - s.start) / 1.6) * Math.PI)
          : 0.25;
      const yRow = mainGeom.getCellCenter(s.row, 0).y;
      ctx.save();
      ctx.globalAlpha = sA * rowPulse * sceneAlpha;
      ctx.strokeStyle = s.col;
      ctx.lineWidth = 2.5;
      roundRectPath(ctx, mainGeom.left + 14, yRow - 42, mainGeom.right - mainGeom.left - 28, 84, 10);
      ctx.stroke();
      ctx.restore();

      // Solution text
      ctx.save();
      ctx.globalAlpha = sA * sceneAlpha;
      ctx.font = 'italic 700 58px "STIX Two Text", Georgia, serif';
      ctx.fillStyle = s.col;
      ctx.shadowColor = s.col;
      ctx.shadowBlur = 16;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label, 1400, 395 + s.row * 112);
      ctx.restore();
    }
  }

  ctx.restore();
}

// ============================================================================
// SCENE 6 — INTERPRETATION AND CONCLUSION (04:30 – 05:00 | 30.0s)
// ============================================================================
function renderScene6(ctx: CanvasRenderingContext2D, t: number) {
  const lt = t - 270; // local time 0..30s
  const fadeIn = easeOutCubic(subProgress(lt, 0, 1.2));
  const finalFadeOut = 1 - easeInOutCubic(subProgress(lt, 27.6, 30.0));
  const sceneAlpha = fadeIn * finalFadeOut;
  if (sceneAlpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = sceneAlpha;
  drawSceneHeader(ctx, '05  |  INTERPRETATION & CONCLUSION', 'From Matrix Structure to Solution', sceneAlpha);

  // Part A (0 – 20s): Identity Matrix + Direct Solution + 4 Takeaways
  const partAOut = 1 - easeInOutCubic(subProgress(lt, 18.2, 20.2));
  if (partAOut > 0.01) {
    const finalMat = WORKED_STEPS[7].matrix;
    const geom = drawMatrix(ctx, finalMat, {
      cx: 485,
      cy: 515,
      cellW: 122,
      cellH: 98,
      fontSize: 44,
      alpha: partAOut,
      cellColors: {
        '0,0': PALETTE.cyanPivot,
        '1,1': PALETTE.cyanPivot,
        '2,2': PALETTE.cyanPivot,
        '0,3': PALETTE.successTeal,
        '1,3': PALETTE.successTeal,
        '2,3': PALETTE.successTeal,
      },
      colHeaders: ['x', 'y', 'z', 'b'],
      colHeaderColors: [PALETTE.cyanPivot, PALETTE.electricBlue, PALETTE.purpleAccent, PALETTE.successTeal],
    });

    // Identity block highlight box
    const idA = easeOutCubic(subProgress(lt, 1.5, 3.0)) * partAOut;
    if (idA > 0.01) {
      const c0 = geom.getCellCenter(0, 0).x - 52;
      const c2 = geom.getCellCenter(0, 2).x + 52;
      ctx.save();
      ctx.globalAlpha = idA * sceneAlpha;
      ctx.strokeStyle = PALETTE.cyanPivot;
      ctx.shadowColor = PALETTE.cyanPivot;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.4;
      roundRectPath(ctx, c0, geom.top + 12, c2 - c0, geom.bottom - geom.top - 24, 12);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.font = '500 22px "DM Sans", sans-serif';
      ctx.fillStyle = PALETTE.cyanPivot;
      ctx.textAlign = 'center';
      ctx.fillText('Identity Matrix (Isolated Variables)', (c0 + c2) / 2, geom.bottom + 42);
      ctx.restore();
    }

    // Solution column highlight
    const solA = easeOutCubic(subProgress(lt, 4.0, 5.5)) * partAOut;
    if (solA > 0.01) {
      const c3 = geom.getCellCenter(0, 3).x;
      ctx.save();
      ctx.globalAlpha = solA * sceneAlpha;
      ctx.strokeStyle = PALETTE.successTeal;
      ctx.shadowColor = PALETTE.successTeal;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.4;
      roundRectPath(ctx, c3 - 48, geom.top + 12, 96, geom.bottom - geom.top - 24, 12);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.font = '500 22px "DM Sans", sans-serif';
      ctx.fillStyle = PALETTE.successTeal;
      ctx.textAlign = 'center';
      ctx.fillText('Solution', c3, geom.bottom + 42);
      ctx.restore();
    }

    // Four concise summary takeaways
    const points = [
      'REF creates the unmistakable staircase structure.',
      'RREF places 1s at pivots with 0s everywhere else in pivot columns.',
      'Elementary row operations preserve the solution set.',
      'RREF provides a systematic, unique path to every solution.',
    ];
    points.forEach((pt, idx) => {
      const pA = easeOutCubic(subProgress(lt, 8.2 + idx * 1.9, 9.6 + idx * 1.9)) * partAOut;
      if (pA <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = pA * sceneAlpha;
      ctx.font = '500 27px "DM Sans", sans-serif';
      ctx.fillStyle = idx === 3 ? PALETTE.successTeal : PALETTE.softWhite;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`•  ${pt}`, 920, 360 + idx * 102);
      ctx.restore();
    });
  }

  // Part B (20 – 25s): Closing Message
  const msgIn = easeOutCubic(subProgress(lt, 19.8, 21.4));
  const msgOut = 1 - easeInOutCubic(subProgress(lt, 23.6, 24.8));
  if (msgIn * msgOut > 0.01) {
    ctx.save();
    ctx.globalAlpha = msgIn * msgOut * sceneAlpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 44px "Outfit", sans-serif';
    ctx.fillStyle = PALETTE.softWhite;
    ctx.fillText('Complex equations.  Simple structure.  Clear solutions.', 960, 520);
    ctx.restore();
  }

  // Part C (24.5 – 30s): End Title Card
  const endIn = easeOutCubic(subProgress(lt, 24.4, 26.2));
  if (endIn > 0.01) {
    ctx.save();
    ctx.globalAlpha = endIn * sceneAlpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = '700 68px "Outfit", sans-serif';
    ctx.fillStyle = PALETTE.softWhite;
    ctx.shadowColor = PALETTE.electricBlue;
    ctx.shadowBlur = 26;
    ctx.fillText('REDUCED ROW ECHELON FORM', 960, 485);

    ctx.shadowBlur = 0;
    ctx.font = 'italic 500 34px "STIX Two Text", Georgia, serif';
    ctx.fillStyle = PALETTE.cyanPivot;
    ctx.fillText('The power of systematic elimination.', 960, 570);
    ctx.restore();
  }

  ctx.restore();
}

// ============================================================================
// MASTER FRAME RENDERER (0.0s – 300.0s)
// ============================================================================
export function renderDocumentaryFrame(
  ctx: CanvasRenderingContext2D,
  tSec: number,
  width = 1920,
  height = 1080,
) {
  const t = Math.max(0, Math.min(300, tSec));

  ctx.save();
  ctx.scale(width / 1920, height / 1080);

  drawCosmicBackdrop(ctx, t, 1920, 1080);

  if (t < 40) {
    renderScene1(ctx, t);
  } else if (t < 85) {
    renderScene2(ctx, t);
  } else if (t < 135) {
    renderScene3(ctx, t);
  } else if (t < 180) {
    renderScene4(ctx, t);
  } else if (t < 270) {
    renderScene5(ctx, t);
  } else {
    renderScene6(ctx, t);
  }

  ctx.restore();
}
