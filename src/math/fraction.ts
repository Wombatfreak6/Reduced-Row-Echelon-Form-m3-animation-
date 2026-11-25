export class Fraction {
  readonly num: number;
  readonly den: number;

  constructor(num: number, den = 1) {
    if (den === 0) throw new Error('Division by zero in Fraction');
    if (!Number.isInteger(num) || !Number.isInteger(den)) {
      // Convert finite decimals to exact fraction
      const str = String(num / den);
      const dec = str.includes('.') ? str.split('.')[1].length : 0;
      const scale = Math.pow(10, Math.min(dec, 6));
      const n = Math.round((num / den) * scale);
      const d = scale;
      const g = gcd(Math.abs(n), Math.abs(d));
      this.num = (d < 0 ? -n : n) / g;
      this.den = Math.abs(d) / g;
      return;
    }
    const sign = den < 0 ? -1 : 1;
    const g = gcd(Math.abs(num), Math.abs(den));
    this.num = (sign * num) / g;
    this.den = Math.abs(den) / g;
  }

  static from(v: number | Fraction): Fraction {
    return v instanceof Fraction ? v : new Fraction(v, 1);
  }

  add(other: Fraction | number): Fraction {
    const o = Fraction.from(other);
    return new Fraction(this.num * o.den + o.num * this.den, this.den * o.den);
  }

  sub(other: Fraction | number): Fraction {
    const o = Fraction.from(other);
    return new Fraction(this.num * o.den - o.num * this.den, this.den * o.den);
  }

  mul(other: Fraction | number): Fraction {
    const o = Fraction.from(other);
    return new Fraction(this.num * o.num, this.den * o.den);
  }

  div(other: Fraction | number): Fraction {
    const o = Fraction.from(other);
    return new Fraction(this.num * o.den, this.den * o.num);
  }

  neg(): Fraction {
    return new Fraction(-this.num, this.den);
  }

  abs(): Fraction {
    return new Fraction(Math.abs(this.num), this.den);
  }

  isZero(): boolean {
    return this.num === 0;
  }

  isOne(): boolean {
    return this.num === 1 && this.den === 1;
  }

  equals(other: Fraction | number): boolean {
    const o = Fraction.from(other);
    return this.num === o.num && this.den === o.den;
  }

  toNumber(): number {
    return this.num / this.den;
  }

  toString(): string {
    if (this.den === 1) return String(this.num);
    return `${this.num}/${this.den}`;
  }
}

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

export type MatrixData = Fraction[][];

export function cloneMatrix(m: MatrixData): MatrixData {
  return m.map((row) => row.map((v) => new Fraction(v.num, v.den)));
}

export function swapRows(m: MatrixData, r1: number, r2: number): MatrixData {
  const next = cloneMatrix(m);
  const tmp = next[r1];
  next[r1] = next[r2];
  next[r2] = tmp;
  return next;
}

export function scaleRow(m: MatrixData, r: number, factor: Fraction): MatrixData {
  if (factor.isZero()) return cloneMatrix(m);
  const next = cloneMatrix(m);
  next[r] = next[r].map((v) => v.mul(factor));
  return next;
}

export function replaceRow(
  m: MatrixData,
  targetRow: number,
  sourceRow: number,
  factor: Fraction,
): MatrixData {
  const next = cloneMatrix(m);
  next[targetRow] = next[targetRow].map((v, col) => v.add(next[sourceRow][col].mul(factor)));
  return next;
}

export interface EchelonCheck {
  zeroRowsAtBottom: boolean;
  pivotsShiftRight: boolean;
  zerosBelowPivots: boolean;
  pivotsEqualOne: boolean;
  zerosAbovePivots: boolean;
  isREF: boolean;
  isRREF: boolean;
  pivots: Array<{ row: number; col: number }>;
}

export function analyzeMatrix(m: MatrixData): EchelonCheck {
  const rows = m.length;
  const cols = m[0]?.length ?? 0;
  let zeroRowsAtBottom = true;
  let pivotsShiftRight = true;
  let zerosBelowPivots = true;
  let pivotsEqualOne = true;
  let zerosAbovePivots = true;

  let seenZeroRow = false;
  let lastPivotCol = -1;
  const pivots: Array<{ row: number; col: number }> = [];

  for (let r = 0; r < rows; r++) {
    let firstNonZero = -1;
    for (let c = 0; c < cols; c++) {
      if (!m[r][c].isZero()) {
        firstNonZero = c;
        break;
      }
    }
    if (firstNonZero === -1) {
      seenZeroRow = true;
      continue;
    }
    if (seenZeroRow) {
      zeroRowsAtBottom = false;
    }
    if (firstNonZero <= lastPivotCol) {
      pivotsShiftRight = false;
    }
    lastPivotCol = firstNonZero;
    pivots.push({ row: r, col: firstNonZero });

    if (!m[r][firstNonZero].isOne()) {
      pivotsEqualOne = false;
    }

    for (let rr = r + 1; rr < rows; rr++) {
      if (!m[rr][firstNonZero].isZero()) {
        zerosBelowPivots = false;
      }
    }
    for (let rr = 0; rr < r; rr++) {
      if (!m[rr][firstNonZero].isZero()) {
        zerosAbovePivots = false;
      }
    }
  }

  const isREF = zeroRowsAtBottom && pivotsShiftRight && zerosBelowPivots;
  const isRREF = isREF && pivotsEqualOne && zerosAbovePivots;

  return {
    zeroRowsAtBottom,
    pivotsShiftRight,
    zerosBelowPivots,
    pivotsEqualOne,
    zerosAbovePivots,
    isREF,
    isRREF,
    pivots,
  };
}

export function f(n: number, d = 1): Fraction {
  return new Fraction(n, d);
}

export interface WorkedStep {
  id: number;
  title: string;
  operationLabel: string;
  phase: 'Initial' | 'Forward Elimination' | 'REF' | 'Back Elimination' | 'Final RREF';
  matrix: MatrixData;
  startSec: number;
  endSec: number;
}

// Verified exact 7-step documentary sequence matching Section 5 of the brief
export const WORKED_STEPS: WorkedStep[] = (() => {
  const m0: MatrixData = [
    [f(2), f(1), f(-1), f(8)],
    [f(-3), f(-1), f(2), f(-11)],
    [f(-2), f(1), f(2), f(-3)],
  ];
  const m1 = scaleRow(m0, 0, f(1, 2));
  const m2 = replaceRow(replaceRow(m1, 1, 0, f(3)), 2, 0, f(2));
  const m3 = scaleRow(m2, 1, f(2));
  const m4 = replaceRow(m3, 2, 1, f(-2));
  const m5 = scaleRow(m4, 2, f(-1));
  const m6 = replaceRow(replaceRow(m5, 1, 2, f(-1)), 0, 2, f(1, 2));
  const m7 = replaceRow(m6, 0, 1, f(-1, 2));

  return [
    {
      id: 0,
      title: 'Initial Augmented Matrix',
      operationLabel: 'System -> Augmented Matrix',
      phase: 'Initial',
      matrix: m0,
      startSec: 180,
      endSec: 186,
    },
    {
      id: 1,
      title: 'Step 1: Scale Row 1',
      operationLabel: 'R₁ → (1/2) R₁',
      phase: 'Forward Elimination',
      matrix: m1,
      startSec: 186,
      endSec: 196,
    },
    {
      id: 2,
      title: 'Step 2: Eliminate Below Pivot 1',
      operationLabel: 'R₂ → R₂ + 3R₁,  R₃ → R₃ + 2R₁',
      phase: 'Forward Elimination',
      matrix: m2,
      startSec: 196,
      endSec: 210,
    },
    {
      id: 3,
      title: 'Step 3: Scale Row 2',
      operationLabel: 'R₂ → 2 R₂',
      phase: 'Forward Elimination',
      matrix: m3,
      startSec: 210,
      endSec: 220,
    },
    {
      id: 4,
      title: 'Step 4: Eliminate Below Pivot 2',
      operationLabel: 'R₃ → R₃ − 2 R₂',
      phase: 'Forward Elimination',
      matrix: m4,
      startSec: 220,
      endSec: 230,
    },
    {
      id: 5,
      title: 'Step 5: Normalize Pivot 3 (REF)',
      operationLabel: 'R₃ → −R₃',
      phase: 'REF',
      matrix: m5,
      startSec: 230,
      endSec: 241,
    },
    {
      id: 6,
      title: 'Step 6: Eliminate Above Pivot 3',
      operationLabel: 'R₂ → R₂ − R₃,  R₁ → R₁ + (1/2) R₃',
      phase: 'Back Elimination',
      matrix: m6,
      startSec: 241,
      endSec: 254,
    },
    {
      id: 7,
      title: 'Step 7: Eliminate Above Pivot 2 (Final RREF)',
      operationLabel: 'R₁ → R₁ − (1/2) R₂',
      phase: 'Final RREF',
      matrix: m7,
      startSec: 254,
      endSec: 270,
    },
  ];
})();
