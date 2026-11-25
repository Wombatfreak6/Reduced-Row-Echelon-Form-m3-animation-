import { LOGICAL_HEIGHT, LOGICAL_WIDTH, TARGET_FPS } from './timeline';
import { renderDocumentaryFrame } from './scenes';
import { renderAmbientWavSegment } from './musicEngine';

export interface ExportProgress {
  phase: 'init' | 'rendering' | 'audio' | 'encoding' | 'done';
  renderedFrames: number;
  totalFrames: number;
  percent: number;
  message: string;
}

function canvasToJpegBytes(canvas: HTMLCanvasElement, quality = 0.92): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode frame blob'));
          return;
        }
        const ab = await blob.arrayBuffer();
        resolve(new Uint8Array(ab));
      },
      'image/jpeg',
      quality,
    );
  });
}

function packLengthPrefixedBatch(frames: Uint8Array[]): Uint8Array {
  let totalLen = 0;
  for (const f of frames) totalLen += 4 + f.byteLength;
  const out = new Uint8Array(totalLen);
  const view = new DataView(out.buffer);
  let offset = 0;
  for (const f of frames) {
    view.setUint32(offset, f.byteLength, false);
    offset += 4;
    out.set(f, offset);
    offset += f.byteLength;
  }
  return out;
}

export async function exportDocumentaryMp4(
  startSec: number,
  endSec: number,
  includeMusic: boolean,
  filename: string,
  onProgress: (progress: ExportProgress) => void,
  signal?: AbortSignal,
): Promise<void> {
  const duration = Math.max(1, endSec - startSec);
  const totalFrames = Math.round(duration * TARGET_FPS);

  onProgress({
    phase: 'init',
    renderedFrames: 0,
    totalFrames,
    percent: 0,
    message: 'Initializing 1920×1080 export pipeline…',
  });

  const initRes = await fetch('/api/export/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fps: TARGET_FPS }),
    signal,
  });
  if (!initRes.ok) {
    throw new Error('Failed to start server export job');
  }
  const { jobId } = (await initRes.json()) as { jobId: string };

  const cleanup = () => {
    void fetch(`/api/export/${jobId}`, { method: 'DELETE' });
  };

  try {
    const canvas = document.createElement('canvas');
    canvas.width = LOGICAL_WIDTH;
    canvas.height = LOGICAL_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to acquire 2D rendering context');

    const batchSize = 30; // 1 second per upload batch
    let batch: Uint8Array[] = [];

    for (let i = 0; i < totalFrames; i++) {
      if (signal?.aborted) {
        cleanup();
        throw new Error('Export cancelled');
      }

      const tSec = startSec + i / TARGET_FPS;
      renderDocumentaryFrame(ctx, tSec, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      const jpeg = await canvasToJpegBytes(canvas, 0.92);
      batch.push(jpeg);

      if (batch.length >= batchSize || i === totalFrames - 1) {
        const packed = packLengthPrefixedBatch(batch);
        batch = [];
        const res = await fetch(`/api/export/${jobId}/frames`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: new Blob([packed.buffer as ArrayBuffer], { type: 'application/octet-stream' }),
          signal,
        });
        if (!res.ok) throw new Error('Failed uploading rendered frame batch');
      }

      const doneCount = i + 1;
      onProgress({
        phase: 'rendering',
        renderedFrames: doneCount,
        totalFrames,
        percent: Math.round((doneCount / totalFrames) * 82),
        message: `Rendering frame ${doneCount} of ${totalFrames} (1920×1080 @ 30 FPS)…`,
      });
    }

    if (includeMusic) {
      onProgress({
        phase: 'audio',
        renderedFrames: totalFrames,
        totalFrames,
        percent: 86,
        message: 'Synthesizing 48 kHz stereo documentary underscore…',
      });
      const wavBytes = renderAmbientWavSegment(startSec, endSec, 48000);
      const audioRes = await fetch(`/api/export/${jobId}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: new Blob([wavBytes.buffer as ArrayBuffer], { type: 'application/octet-stream' }),
        signal,
      });
      if (!audioRes.ok) throw new Error('Failed uploading audio track');
    }

    onProgress({
      phase: 'encoding',
      renderedFrames: totalFrames,
      totalFrames,
      percent: 92,
      message: 'Encoding H.264 MP4 with FFmpeg…',
    });

    const finalRes = await fetch(`/api/export/${jobId}/finalize`, {
      method: 'POST',
      signal,
    });
    if (!finalRes.ok) {
      const errText = await finalRes.text();
      throw new Error(errText || 'FFmpeg encoding failed');
    }

    const mp4Blob = await finalRes.blob();
    const url = URL.createObjectURL(mp4Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    onProgress({
      phase: 'done',
      renderedFrames: totalFrames,
      totalFrames,
      percent: 100,
      message: 'MP4 export complete.',
    });
  } catch (err) {
    cleanup();
    throw err;
  }
}
