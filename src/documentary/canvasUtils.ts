import { Fraction } from '../math/fraction';

export const PALETTE = {
  bgCenter: '#0B132B',
  bgEdge: '#040710',
  panelBg: 'rgba(11, 18, 36, 0.88)',
  electricBlue: '#3B82F6',
  cyanPivot: '#00F0FF',
  purpleAccent: '#A855F7',
  softWhite: '#F1F5F9',
  mutedSlate: '#94A3B8',
  dimSlate: '#475569',
  successTeal: '#2DD4BF',
  amberOp: '#F59E0B',
};

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function subProgress(t: number, start: number, end: number): number {
  if (end <= start) return t >= end ? 1 : 0;
  return clamp01((t - start) / (end - start));
}

export function easeInOutCubic(x: number): number {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(x: number): number {
  const t = clamp01(x);
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutBack(x: number): number {
  const t = clamp01(x);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface Particle {
  bx: number;
  by: number;
  radius: number;
  color: string;
  alpha: number;
  sx: number;
  sy: number;
  ph: number;
}

interface BgGlyph {
  sym: string;
  bx: number;
  by: number;
  ph: number;
  speed: number;
}

// Deterministic seeded particles for 1920x1080 stage
const PARTICLES: Particle[] = (() => {
  const list: Particle[] = [];
  let seed = 1337;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const colors = [PALETTE.electricBlue, PALETTE.cyanPivot, PALETTE.purpleAccent];
  for (let i = 0; i < 48; i++) {
    list.push({
      bx: rand() * 1920,
      by: rand() * 1080,
      radius: 1.5 + rand() * 3.0,
      color: colors[i % colors.length],
      alpha: 0.14 + rand() * 0.34,
      sx: 0.15 + rand() * 0.35,
      sy: 0.12 + rand() * 0.3,
      ph: rand() * Math.PI * 2,
    });
  }
  return list;
})();

const BG_GLYPHS: BgGlyph[] = [
  { sym: '∑', bx: 210, by: 220, ph: 0.4, speed: 0.18 },
  { sym: 'λ', bx: 1680, by: 190, ph: 1.7, speed: 0.22 },
  { sym: 'Rᵢ', bx: 1580, by: 870, ph: 2.8, speed: 0.16 },
  { sym: 'Iₙ', bx: 290, by: 850, ph: 4.1, speed: 0.2 },
  { sym: 'α', bx: 1380, by: 310, ph: 5.0, speed: 0.15 },
  { sym: 'x⃗', bx: 480, by: 170, ph: 3.3, speed: 0.19 },
];

export function drawCosmicBackdrop(
  ctx: CanvasRenderingContext2D,
  tSec: number,
  w = 1920,
  h = 1080,
) {
  // Radial cosmic navy -> black gradient
  const grad = ctx.createRadialGradient(w * 0.5, h * 0.46, 60, w * 0.5, h * 0.5, w * 0.72);
  grad.addColorStop(0, PALETTE.bgCenter);
  grad.addColorStop(0.55, '#070C1A');
  grad.addColorStop(1, PALETTE.bgEdge);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Subtle architectural coordinate grid
  ctx.save();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.055)';
  ctx.lineWidth = 1;
  const step = 80;
  const offsetX = (w / 2) % step;
  const offsetY = (h / 2) % step;
  ctx.beginPath();
  for (let x = offsetX; x <= w; x += step) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = offsetY; y <= h; y += step) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Subtle center crosshair axes
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  ctx.restore();

  // Floating particles
  ctx.save();
  for (const p of PARTICLES) {
    const px = p.bx + 26 * Math.sin(p.sx * tSec + p.ph);
    const py = p.by + 20 * Math.cos(p.sy * tSec + p.ph);
    const twinkle = 0.7 + 0.3 * Math.sin(tSec * 0.8 + p.ph);
    ctx.globalAlpha = p.alpha * twinkle;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(px, py, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Faint floating math symbols
  ctx.font = 'italic 42px "STIX Two Text", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.purpleAccent;
  for (const g of BG_GLYPHS) {
    ctx.globalAlpha = 0.05 + 0.025 * Math.sin(tSec * 0.4 + g.ph);
    ctx.fillText(
      g.sym,
      g.bx + 18 * Math.sin(g.speed * tSec + g.ph),
      g.by + 18 * Math.cos(g.speed * tSec + g.ph),
    );
  }
  ctx.restore();
}

export function drawSceneHeader(
  ctx: CanvasRenderingContext2D,
  chapterLabel: string,
  subtitle: string,
  alpha = 1,
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.font = '600 22px "Outfit", sans-serif';
  ctx.fillStyle = PALETTE.electricBlue;
  ctx.fillText(chapterLabel, 76, 48);

  if (subtitle) {
    ctx.font = '400 20px "DM Sans", sans-serif';
    ctx.fillStyle = PALETTE.mutedSlate;
    ctx.fillText(subtitle, 76, 80);
  }
  ctx.restore();
}

export function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  color: string,
  alpha = 1,
  fontSize = 30,
  minWidth = 0,
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `500 ${fontSize}px "STIX Two Text", "DM Sans", sans-serif`;
  const metrics = ctx.measureText(text);
  const bw = Math.max(minWidth, metrics.width + 64);
  const bh = fontSize + 34;
  const x = cx - bw / 2;
  const y = cy - bh / 2;

  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(10, 17, 36, 0.92)';
  roundRectPath(ctx, x, y, bw, bh, 12);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRectPath(ctx, x, y, bw, bh, 12);
  ctx.stroke();

  ctx.fillStyle = PALETTE.softWhite;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 1);
  ctx.restore();
}

export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

/**
 * Renders an integer or stacked fraction (e.g. "-1/2", "7/2", "3") with crisp mathematical typesetting.
 */
export function drawMathValue(
  ctx: CanvasRenderingContext2D,
  value: string | Fraction,
  cx: number,
  cy: number,
  fontSize = 46,
  color = PALETTE.softWhite,
  alpha = 1,
  glowBlur = 0,
) {
  if (alpha <= 0.01) return;
  const raw = value instanceof Fraction ? value.toString() : value;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (glowBlur > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glowBlur;
  }

  if (raw.includes('/')) {
    const isNeg = raw.startsWith('-');
    const clean = isNeg ? raw.slice(1) : raw;
    const [numStr, denStr] = clean.split('/');
    const subSize = Math.round(fontSize * 0.66);
    ctx.font = `600 ${subSize}px "STIX Two Text", Georgia, serif`;
    const numW = ctx.measureText(numStr).width;
    const denW = ctx.measureText(denStr).width;
    const barW = Math.max(numW, denW) + 14;

    const shiftX = isNeg ? 10 : 0;
    if (isNeg) {
      ctx.font = `600 ${Math.round(fontSize * 0.9)}px "STIX Two Text", Georgia, serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText('−', cx + shiftX - barW / 2 - 5, cy);
    }

    ctx.font = `600 ${subSize}px "STIX Two Text", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(numStr, cx + shiftX, cy - 4);

    ctx.lineWidth = Math.max(2, fontSize * 0.055);
    ctx.beginPath();
    ctx.moveTo(cx + shiftX - barW / 2, cy);
    ctx.lineTo(cx + shiftX + barW / 2, cy);
    ctx.stroke();

    ctx.textBaseline = 'top';
    ctx.fillText(denStr, cx + shiftX, cy + 5);
  } else {
    const display = raw.startsWith('-') ? `−${raw.slice(1)}` : raw;
    ctx.font = `600 ${fontSize}px "STIX Two Text", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(display, cx, cy);
  }
  ctx.restore();
}

export interface MatrixRenderOptions {
  cx: number;
  cy: number;
  augmented?: boolean;
  cellW?: number;
  cellH?: number;
  fontSize?: number;
  alpha?: number;
  bracketColor?: string;
  dividerColor?: string;
  colHeaders?: string[];
  colHeaderColors?: string[];
  colHeaderAlpha?: number;
  rowAlphas?: number[];
  rowOffsets?: Array<{ dx: number; dy: number }>;
  cellColors?: Record<string, string>;
  cellAlphas?: Record<string, number>;
  cellScales?: Record<string, number>;
  cellGlows?: Record<string, number>;
  rowHighlights?: Array<{ row: number; color: string; alpha?: number }>;
  colHighlights?: Array<{ col: number; color: string; alpha?: number }>;
  cellHighlights?: Array<{ row: number; col: number; color: string; alpha?: number }>;
}

export interface MatrixGeometry {
  left: number;
  right: number;
  top: number;
  bottom: number;
  getCellCenter: (r: number, c: number) => { x: number; y: number };
}

export function getMatrixGeometry(
  rows: number,
  cols: number,
  cx: number,
  cy: number,
  cellW = 128,
  cellH = 98,
  augmented = true,
): MatrixGeometry {
  const augGap = augmented ? 36 : 0;
  const totalW = (cols - 1) * cellW + augGap;
  const totalH = (rows - 1) * cellH;
  const startX = cx - totalW / 2;
  const startY = cy - totalH / 2;

  const getCellCenter = (r: number, c: number) => {
    const extraX = augmented && c === cols - 1 ? augGap : 0;
    return {
      x: startX + c * cellW + extraX,
      y: startY + r * cellH,
    };
  };

  return {
    left: startX - cellW * 0.56,
    right: startX + totalW + cellW * 0.56,
    top: startY - cellH * 0.56,
    bottom: startY + totalH + cellH * 0.56,
    getCellCenter,
  };
}

export function drawMatrix(
  ctx: CanvasRenderingContext2D,
  grid: Array<Array<string | Fraction>>,
  opts: MatrixRenderOptions,
): MatrixGeometry {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const cellW = opts.cellW ?? 132;
  const cellH = opts.cellH ?? 102;
  const fontSize = opts.fontSize ?? 46;
  const alpha = opts.alpha ?? 1;
  const augmented = opts.augmented ?? true;

  const geom = getMatrixGeometry(rows, cols, opts.cx, opts.cy, cellW, cellH, augmented);
  if (alpha <= 0.01) return geom;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Row highlights
  if (opts.rowHighlights) {
    for (const rh of opts.rowHighlights) {
      const a = rh.alpha ?? 1;
      if (a <= 0.01) continue;
      const offset = opts.rowOffsets?.[rh.row] ?? { dx: 0, dy: 0 };
      const yCenter = geom.getCellCenter(rh.row, 0).y + offset.dy;
      ctx.save();
      ctx.globalAlpha = alpha * a;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.strokeStyle = rh.color;
      ctx.shadowColor = rh.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      roundRectPath(
        ctx,
        geom.left + 14 + offset.dx,
        yCenter - cellH * 0.42,
        geom.right - geom.left - 28,
        cellH * 0.84,
        10,
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Column highlights
  if (opts.colHighlights) {
    for (const ch of opts.colHighlights) {
      const a = ch.alpha ?? 1;
      if (a <= 0.01) continue;
      const xCenter = geom.getCellCenter(0, ch.col).x;
      ctx.save();
      ctx.globalAlpha = alpha * a;
      ctx.strokeStyle = ch.color;
      ctx.shadowColor = ch.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;
      roundRectPath(
        ctx,
        xCenter - cellW * 0.42,
        geom.top + 10,
        cellW * 0.84,
        geom.bottom - geom.top - 20,
        10,
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  // Brackets
  const brkColor = opts.bracketColor ?? PALETTE.electricBlue;
  const brkLip = 20;
  ctx.save();
  ctx.strokeStyle = brkColor;
  ctx.shadowColor = brkColor;
  ctx.shadowBlur = 12;
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Left bracket
  ctx.beginPath();
  ctx.moveTo(geom.left + brkLip, geom.top);
  ctx.lineTo(geom.left, geom.top);
  ctx.lineTo(geom.left, geom.bottom);
  ctx.lineTo(geom.left + brkLip, geom.bottom);
  ctx.stroke();

  // Right bracket
  ctx.beginPath();
  ctx.moveTo(geom.right - brkLip, geom.top);
  ctx.lineTo(geom.right, geom.top);
  ctx.lineTo(geom.right, geom.bottom);
  ctx.lineTo(geom.right - brkLip, geom.bottom);
  ctx.stroke();

  // Augmented divider line
  if (augmented && cols >= 2) {
    const cPrev = geom.getCellCenter(0, cols - 2).x;
    const cLast = geom.getCellCenter(0, cols - 1).x;
    const divX = (cPrev + cLast) / 2 - 4;
    ctx.strokeStyle = opts.dividerColor ?? PALETTE.electricBlue;
    ctx.lineWidth = 2.6;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(divX, geom.top + 10);
    ctx.lineTo(divX, geom.bottom - 10);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  // Column headers
  if (opts.colHeaders && (opts.colHeaderAlpha ?? 1) > 0.01) {
    ctx.save();
    ctx.globalAlpha = alpha * (opts.colHeaderAlpha ?? 1);
    ctx.font = 'italic 600 32px "STIX Two Text", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let c = 0; c < Math.min(cols, opts.colHeaders.length); c++) {
      const p = geom.getCellCenter(0, c);
      ctx.fillStyle = opts.colHeaderColors?.[c] ?? PALETTE.mutedSlate;
      ctx.fillText(opts.colHeaders[c], p.x, geom.top - 30);
    }
    ctx.restore();
  }

  // Cell highlights (pivot rings, active cells)
  if (opts.cellHighlights) {
    for (const ch of opts.cellHighlights) {
      const a = ch.alpha ?? 1;
      if (a <= 0.01) continue;
      const offset = opts.rowOffsets?.[ch.row] ?? { dx: 0, dy: 0 };
      const pos = geom.getCellCenter(ch.row, ch.col);
      ctx.save();
      ctx.globalAlpha = alpha * a;
      ctx.strokeStyle = ch.color;
      ctx.shadowColor = ch.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 2.6;
      roundRectPath(
        ctx,
        pos.x + offset.dx - 40,
        pos.y + offset.dy - 36,
        80,
        72,
        10,
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  // Entries
  for (let r = 0; r < rows; r++) {
    const rAlpha = opts.rowAlphas?.[r] ?? 1;
    const offset = opts.rowOffsets?.[r] ?? { dx: 0, dy: 0 };
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      const cAlpha = opts.cellAlphas?.[key] ?? 1;
      const cScale = opts.cellScales?.[key] ?? 1;
      const cColor = opts.cellColors?.[key] ?? PALETTE.softWhite;
      const cGlow = opts.cellGlows?.[key] ?? 0;
      const pos = geom.getCellCenter(r, c);

      ctx.save();
      ctx.translate(pos.x + offset.dx, pos.y + offset.dy);
      ctx.scale(cScale, cScale);
      drawMathValue(
        ctx,
        grid[r][c],
        0,
        0,
        fontSize,
        cColor,
        alpha * rAlpha * cAlpha,
        cGlow,
      );
      ctx.restore();
    }
  }

  ctx.restore();
  return geom;
}

/**
 * Draws a crisp glowing staircase path underneath diagonal pivots.
 */
export function drawStaircase(
  ctx: CanvasRenderingContext2D,
  geom: MatrixGeometry,
  pivots: Array<{ row: number; col: number }>,
  cols: number,
  progress: number,
  color = PALETTE.cyanPivot,
  alpha = 1,
) {
  if (progress <= 0.01 || alpha <= 0.01 || pivots.length === 0) return;

  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < pivots.length; i++) {
    const { row, col } = pivots[i];
    const center = geom.getCellCenter(row, col);
    const leftX = center.x - 46;
    const botY = center.y + 42;
    if (i === 0) {
      points.push({ x: leftX, y: center.y - 38 });
    }
    points.push({ x: leftX, y: botY });
    if (i < pivots.length - 1) {
      const nextCenter = geom.getCellCenter(pivots[i + 1].row, pivots[i + 1].col);
      points.push({ x: nextCenter.x - 46, y: botY });
    } else {
      const rightMost = geom.getCellCenter(row, cols - 1).x + 48;
      points.push({ x: rightMost, y: botY });
    }
  }

  // Compute total length and draw proportional slice
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const l = Math.hypot(dx, dy);
    segLens.push(l);
    totalLen += l;
  }

  let targetLen = totalLen * clamp01(progress);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < segLens.length; i++) {
    if (targetLen <= 0) break;
    const l = segLens[i];
    if (targetLen >= l) {
      ctx.lineTo(points[i + 1].x, points[i + 1].y);
      targetLen -= l;
    } else {
      const f = targetLen / l;
      ctx.lineTo(
        lerp(points[i].x, points[i + 1].x, f),
        lerp(points[i].y, points[i + 1].y, f),
      );
      targetLen = 0;
    }
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a stylized 3D wireframe coordinate projection with 3 intersecting planes
 * and a stationary intersection point (2, 3, -1) to illustrate solution-set invariance.
 */
export function draw3DPlanesInvariance(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  angle: number,
  alpha: number,
  planeBlend = 0,
) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);

  const proj = (x: number, y: number, z: number) => {
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const rx = x * ca - z * sa;
    const rz = x * sa + z * ca;
    const ry = y * 0.92 - rz * 0.34;
    return { x: rx * radius, y: -ry * radius };
  };

  // Axes
  const axes: Array<[number, number, number, string]> = [
    [1.15, 0, 0, 'rgba(0, 240, 255, 0.35)'],
    [0, 1.15, 0, 'rgba(59, 130, 246, 0.35)'],
    [0, 0, 1.15, 'rgba(168, 85, 247, 0.35)'],
  ];
  for (const [ax, ay, az, col] of axes) {
    const p1 = proj(-ax, -ay, -az);
    const p2 = proj(ax, ay, az);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Three planes orbiting / tilting around the fixed solution point (0.28, 0.36, -0.18)
  const sol = { x: 0.25, y: 0.3, z: -0.18 };
  const planeConfigs = [
    { u: [0.85, 0.15, 0.2], v: [0.1, 0.8, -0.35], col: 'rgba(0, 240, 255, 0.16)', stroke: 'rgba(0, 240, 255, 0.55)' },
    { u: [0.75, -0.45, 0.15], v: [0.2, 0.4, 0.8], col: 'rgba(59, 130, 246, 0.16)', stroke: 'rgba(59, 130, 246, 0.55)' },
    { u: [-0.35, 0.75, 0.25], v: [0.65, 0.2, -0.55], col: 'rgba(168, 85, 247, 0.16)', stroke: 'rgba(168, 85, 247, 0.55)' },
  ];

  planeConfigs.forEach((pl, idx) => {
    const tilt = 0.22 * Math.sin(planeBlend * Math.PI * 2 + idx * 1.4);
    const ux = pl.u[0];
    const uy = pl.u[1] + tilt * 0.3;
    const uz = pl.u[2];
    const vx = pl.v[0];
    const vy = pl.v[1];
    const vz = pl.v[2] - tilt * 0.3;

    const corners = [
      proj(sol.x - ux - vx, sol.y - uy - vy, sol.z - uz - vz),
      proj(sol.x + ux - vx, sol.y + uy - vy, sol.z + uz - vz),
      proj(sol.x + ux + vx, sol.y + uy + vy, sol.z + uz + vz),
      proj(sol.x - ux + vx, sol.y - uy + vy, sol.z - uz + vz),
    ];

    ctx.fillStyle = pl.col;
    ctx.strokeStyle = pl.stroke;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // Fixed intersection point glowing
  const pt = proj(sol.x, sol.y, sol.z);
  ctx.shadowColor = PALETTE.successTeal;
  ctx.shadowBlur = 18;
  ctx.fillStyle = PALETTE.successTeal;
  ctx.beginPath();
  ctx.arc(pt.x, pt.y, 7.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.softWhite;
  ctx.textAlign = 'left';
  ctx.fillText('(2, 3, −1)', pt.x + 14, pt.y - 10);

  ctx.restore();
}
