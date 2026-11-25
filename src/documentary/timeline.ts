export interface VoiceoverCue {
  id: string;
  sceneNumber: number;
  startSec: number;
  endSec: number;
  timestampLabel: string;
  visualAction: string;
  narration: string;
  pauseHint?: string;
}

export interface DocumentarySceneInfo {
  id: number;
  title: string;
  shortTitle: string;
  startSec: number;
  endSec: number;
  timeRange: string;
  summary: string;
}

export const TOTAL_DURATION = 300; // 5 minutes exactly (300 seconds)
export const TARGET_FPS = 30;
export const LOGICAL_WIDTH = 1920;
export const LOGICAL_HEIGHT = 1080;

export const DOCUMENTARY_SCENES: DocumentarySceneInfo[] = [
  {
    id: 1,
    title: 'Scene 1 — The Mystery of Linear Systems',
    shortTitle: '1. Mystery of Systems',
    startSec: 0,
    endSec: 40,
    timeRange: '00:00 – 00:40',
    summary: 'Variables x, y, z align into a linear system and transform into an augmented matrix.',
  },
  {
    id: 2,
    title: 'Scene 2 — Understanding Matrices and Pivots',
    shortTitle: '2. Matrices & Pivots',
    startSec: 40,
    endSec: 85,
    timeRange: '00:40 – 01:25',
    summary: 'Anatomy of rows, columns, leading entries, and the Row Echelon Form staircase.',
  },
  {
    id: 3,
    title: 'Scene 3 — The Three Elementary Row Operations',
    shortTitle: '3. Row Operations',
    startSec: 85,
    endSec: 135,
    timeRange: '01:25 – 02:15',
    summary: 'Animated row swapping, row scaling, and column-by-column row replacement.',
  },
  {
    id: 4,
    title: 'Scene 4 — From REF to RREF',
    shortTitle: '4. REF to RREF',
    startSec: 135,
    endSec: 180,
    timeRange: '02:15 – 03:00',
    summary: 'Normalizing pivots to 1, eliminating entries above pivots, and uniqueness of RREF.',
  },
  {
    id: 5,
    title: 'Scene 5 — Complete Worked Example',
    shortTitle: '5. Worked Example',
    startSec: 180,
    endSec: 270,
    timeRange: '03:00 – 04:30',
    summary: 'All seven exact row operations transforming the opening system into its solution.',
  },
  {
    id: 6,
    title: 'Scene 6 — Interpretation and Conclusion',
    shortTitle: '6. Interpretation',
    startSec: 270,
    endSec: 300,
    timeRange: '04:30 – 05:00',
    summary: 'The identity block isolates every variable, revealing x = 2, y = 3, z = −1.',
  },
];

export const VOICEOVER_CUES: VoiceoverCue[] = [
  // Scene 1
  {
    id: 's1-1',
    sceneNumber: 1,
    startSec: 0,
    endSec: 8,
    timestampLabel: '00:00',
    visualAction: 'Glowing x, y, z symbols drift over a subtle 3D plane intersection grid.',
    narration:
      'Imagine three unknown quantities—x, y, and z—locked together inside a geometric web of constraints.',
  },
  {
    id: 's1-2',
    sceneNumber: 1,
    startSec: 8,
    endSec: 18,
    timestampLabel: '00:08',
    visualAction: 'Three equations float in from space and align cleanly behind a left brace.',
    narration:
      'Individually, each equation describes only a single constraint. Together, they form a system of linear equations.',
  },
  {
    id: 's1-3',
    sceneNumber: 1,
    startSec: 18,
    endSec: 29,
    timestampLabel: '00:18',
    visualAction: 'Central question appears; variables dissolve as coefficients fly into an augmented matrix.',
    narration:
      'How can we systematically solve a system of equations without getting lost in complicated algebra? By stripping away the symbols and organizing every coefficient into an augmented matrix.',
  },
  {
    id: 's1-4',
    sceneNumber: 1,
    startSec: 29,
    endSec: 40,
    timestampLabel: '00:29',
    visualAction: 'Title reveal: REDUCED ROW ECHELON FORM over the glowing matrix.',
    narration:
      'Welcome to Reduced Row Echelon Form—the architecture of systematic elimination.',
    pauseHint: 'Pause 2.5s for title reveal',
  },

  // Scene 2
  {
    id: 's2-1',
    sceneNumber: 2,
    startSec: 40,
    endSec: 52,
    timestampLabel: '00:40',
    visualAction: 'Equations map row-by-row into the augmented matrix; x, y, z, b column headers appear.',
    narration:
      'Every equation becomes a horizontal row, while every vertical column tracks a single variable—with the constants separated on the right.',
  },
  {
    id: 's2-2',
    sceneNumber: 2,
    startSec: 52,
    endSec: 62,
    timestampLabel: '00:52',
    visualAction: 'Row 1 and Column 1 highlight; first nonzero entries glow cyan as pivots.',
    narration:
      'Within each nonzero row, the very first nonzero entry from the left is called a pivot, or leading entry.',
  },
  {
    id: 's2-3',
    sceneNumber: 2,
    startSec: 62,
    endSec: 76,
    timestampLabel: '01:02',
    visualAction: 'REF rules appear; zero row moves to bottom and entry below pivot clears to zero.',
    narration:
      'Our first milestone is Row Echelon Form. Zero rows sit at the bottom, each pivot steps strictly to the right of the one above it, and all entries below each pivot are zero.',
  },
  {
    id: 's2-4',
    sceneNumber: 2,
    startSec: 76,
    endSec: 85,
    timestampLabel: '01:16',
    visualAction: 'Glowing cyan staircase traces progressively beneath the pivots.',
    narration: 'Notice that unmistakable staircase pattern.',
    pauseHint: 'Pause 2s as staircase traces',
  },

  // Scene 3
  {
    id: 's3-1',
    sceneNumber: 3,
    startSec: 85,
    endSec: 99,
    timestampLabel: '01:25',
    visualAction: 'R1 ↔ R2: Rows 1 and 2 physically swap positions along curved arcs; Row 3 dims.',
    narration:
      'To reshape any matrix into echelon form, we rely on just three elementary row operations. First, row swapping exchanges the order of two equations.',
  },
  {
    id: 's3-2',
    sceneNumber: 3,
    startSec: 99,
    endSec: 114,
    timestampLabel: '01:39',
    visualAction: 'R1 → (1/2) R1: multiplier × 1/2 animates across every entry in Row 1.',
    narration:
      'Second, row scaling multiplies every element in a row by the same nonzero constant.',
  },
  {
    id: 's3-3',
    sceneNumber: 3,
    startSec: 114,
    endSec: 130,
    timestampLabel: '01:54',
    visualAction: 'R2 → R2 + 3R1: column-by-column addition animates from column 1 to column 4.',
    narration:
      'Third, row replacement adds a multiple of one row to another, working cleanly column by column.',
    pauseHint: 'Pause 3s during column-by-column arithmetic',
  },
  {
    id: 's3-4',
    sceneNumber: 3,
    startSec: 130,
    endSec: 135,
    timestampLabel: '02:10',
    visualAction: 'Solution intersection point stays fixed while planes transform.',
    narration:
      'Crucially, these operations transform the matrix without changing the solution set.',
  },

  // Scene 4
  {
    id: 's4-1',
    sceneNumber: 4,
    startSec: 135,
    endSec: 145,
    timestampLabel: '02:15',
    visualAction: 'Pipeline header appears; REF staircase stays on left while right copy prepares to reduce.',
    narration:
      'Row Echelon Form creates zeros below every pivot, but Reduced Row Echelon Form goes further.',
  },
  {
    id: 's4-2',
    sceneNumber: 4,
    startSec: 145,
    endSec: 156,
    timestampLabel: '02:25',
    visualAction: 'Right matrix normalizes each pivot entry to 1 in cyan.',
    narration: 'First, every leading entry is scaled so that it becomes exactly one.',
  },
  {
    id: 's4-3',
    sceneNumber: 4,
    startSec: 156,
    endSec: 170,
    timestampLabel: '02:36',
    visualAction: 'Entries above pivots in columns 3 and 2 animate to zero.',
    narration:
      'Next, we eliminate every nonzero entry above each pivot, leaving each pivot column with a single one and zeros everywhere else.',
  },
  {
    id: 's4-4',
    sceneNumber: 4,
    startSec: 170,
    endSec: 180,
    timestampLabel: '02:50',
    visualAction: 'Side-by-side REF vs RREF comparison; uniqueness theorem highlights.',
    narration:
      'And unlike Row Echelon Form, the Reduced Row Echelon Form of any matrix is completely unique.',
  },

  // Scene 5
  {
    id: 's5-1',
    sceneNumber: 5,
    startSec: 180,
    endSec: 186,
    timestampLabel: '03:00',
    visualAction: 'Opening 3×4 augmented matrix centers on screen.',
    narration: "Now let's solve our opening system step by step, with no shortcuts.",
  },
  {
    id: 's5-2',
    sceneNumber: 5,
    startSec: 186,
    endSec: 196,
    timestampLabel: '03:06',
    visualAction: 'Step 1: R1 → (1/2) R1 produces [1, 1/2, -1/2 | 4].',
    narration: 'Step one: scale Row 1 by one-half to create our first leading one.',
    pauseHint: 'Pause 2s for Row 1 scaling',
  },
  {
    id: 's5-3',
    sceneNumber: 5,
    startSec: 196,
    endSec: 210,
    timestampLabel: '03:16',
    visualAction: 'Step 2: R2 → R2 + 3R1 and R3 → R3 + 2R1 clear column 1 below pivot.',
    narration:
      'Step two: eliminate below that pivot—adding three times Row 1 to Row 2, and two times Row 1 to Row 3.',
    pauseHint: 'Pause 3s for both row replacements',
  },
  {
    id: 's5-4',
    sceneNumber: 5,
    startSec: 210,
    endSec: 220,
    timestampLabel: '03:30',
    visualAction: 'Step 3: R2 → 2R2 scales Row 2 to [0, 1, 1 | 2].',
    narration: 'Step three: double Row 2 so our second pivot becomes one.',
    pauseHint: 'Pause 2s',
  },
  {
    id: 's5-5',
    sceneNumber: 5,
    startSec: 220,
    endSec: 230,
    timestampLabel: '03:40',
    visualAction: 'Step 4: R3 → R3 − 2R2 produces [0, 0, -1 | 1].',
    narration: 'Step four: subtract twice Row 2 from Row 3 to clear column two.',
    pauseHint: 'Pause 2s',
  },
  {
    id: 's5-6',
    sceneNumber: 5,
    startSec: 230,
    endSec: 241,
    timestampLabel: '03:50',
    visualAction: 'Step 5: R3 → −R3 yields [0, 0, 1 | -1]; REF staircase glows.',
    narration:
      'Step five: negate Row 3. Every pivot is one with zeros below—we have reached Row Echelon Form.',
    pauseHint: 'Pause 2s on REF milestone',
  },
  {
    id: 's5-7',
    sceneNumber: 5,
    startSec: 241,
    endSec: 254,
    timestampLabel: '04:01',
    visualAction: 'Step 6: R2 → R2 − R3 and R1 → R1 + (1/2)R3 clear column 3 above pivot.',
    narration:
      'Now, back elimination. Step six uses Row 3 to clear column three above it, leaving seven-halves and three on the right.',
    pauseHint: 'Pause 2.5s',
  },
  {
    id: 's5-8',
    sceneNumber: 5,
    startSec: 254,
    endSec: 262,
    timestampLabel: '04:14',
    visualAction: 'Step 7: R1 → R1 − (1/2)R2 reaches final RREF [1 0 0 | 2; 0 1 0 | 3; 0 0 1 | -1].',
    narration:
      'Finally, step seven subtracts half of Row 2 from Row 1, completing Reduced Row Echelon Form.',
  },
  {
    id: 's5-9',
    sceneNumber: 5,
    startSec: 262,
    endSec: 270,
    timestampLabel: '04:22',
    visualAction: 'Each variable x = 2, y = 3, z = -1 illuminates beside its row.',
    narration:
      'The solution emerges effortlessly: x equals two, y equals three, and z equals negative one.',
  },

  // Scene 6
  {
    id: 's6-1',
    sceneNumber: 6,
    startSec: 270,
    endSec: 280,
    timestampLabel: '04:30',
    visualAction: 'Identity matrix on left highlights in cyan; solution column highlights on right.',
    narration:
      'The identity matrix on the left tells us every variable has been isolated, so the final column gives the solution directly.',
  },
  {
    id: 's6-2',
    sceneNumber: 6,
    startSec: 280,
    endSec: 290,
    timestampLabel: '04:40',
    visualAction: 'Four summary principles appear sequentially.',
    narration:
      'Row Echelon Form builds the staircase. Reduced Row Echelon Form isolates the pivots. Elementary row operations preserve the solution set at every step.',
  },
  {
    id: 's6-3',
    sceneNumber: 6,
    startSec: 290,
    endSec: 300,
    timestampLabel: '04:50',
    visualAction: 'Closing message and end title card fade softly into dark space.',
    narration:
      'Complex equations. Simple structure. Clear solutions. That is the power of systematic elimination.',
    pauseHint: 'Fade out music & visuals to 05:00',
  },
];

export function formatTimecode(sec: number): string {
  const clamped = Math.max(0, Math.min(TOTAL_DURATION, sec));
  const m = Math.floor(clamped / 60);
  const s = Math.floor(clamped % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function buildVoiceoverMarkdown(): string {
  const lines: string[] = [
    '# REDUCED ROW ECHELON FORM — VOICEOVER SYNCHRONIZATION SCRIPT',
    '',
    '**Subtitle:** *How Matrices Reveal the Solutions to Linear Systems*',
    '**Format:** 1920 × 1080 · 30 FPS · 16:9 · 05:00 (300 seconds)',
    '',
    '---',
    '',
  ];

  for (const scene of DOCUMENTARY_SCENES) {
    lines.push(`## ${scene.title} (${scene.timeRange})`);
    lines.push('');
    lines.push('| Timestamp | Visual Action | Spoken Narration |');
    lines.push('|---|---|---|');
    const cues = VOICEOVER_CUES.filter((c) => c.sceneNumber === scene.id);
    for (const cue of cues) {
      const pause = cue.pauseHint ? ` *(${cue.pauseHint})*` : '';
      lines.push(
        `| \`${cue.timestampLabel}\` | ${cue.visualAction} | "${cue.narration}"${pause} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}
