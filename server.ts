import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

interface ExportJob {
  dir: string;
  frameCount: number;
  hasAudio: boolean;
  fps: number;
  createdAt: number;
}

const exportJobs = new Map<string, ExportJob>();

// Clean up stale export temp directories older than 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of exportJobs.entries()) {
    if (job.createdAt < cutoff) {
      fs.rmSync(job.dir, { recursive: true, force: true });
      exportJobs.delete(id);
    }
  }
}, 5 * 60 * 1000).unref();

async function startServer() {
  const app = express();

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // 1. Initialize an export job
  app.post('/api/export/init', express.json(), (req: Request, res: Response) => {
    const fps = Number(req.body?.fps || 30);
    const jobId = crypto.randomUUID();
    const dir = path.join(os.tmpdir(), `rref-export-${jobId}`);
    fs.mkdirSync(dir, { recursive: true });
    exportJobs.set(jobId, {
      dir,
      frameCount: 0,
      hasAudio: false,
      fps: Number.isFinite(fps) && fps > 0 ? fps : 30,
      createdAt: Date.now(),
    });
    res.json({ jobId });
  });

  // 2. Receive a length-prefixed binary batch of JPEG frames
  app.post(
    '/api/export/:jobId/frames',
    express.raw({ type: 'application/octet-stream', limit: '64mb' }),
    (req: Request, res: Response) => {
      const jobId = String(req.params.jobId);
      const job = exportJobs.get(jobId);
      if (!job) {
        res.status(404).json({ error: 'Export job not found' });
        return;
      }

      const buf = req.body as Buffer;
      if (!Buffer.isBuffer(buf) || buf.length < 4) {
        res.status(400).json({ error: 'Invalid frame batch buffer' });
        return;
      }

      let offset = 0;
      let added = 0;
      while (offset + 4 <= buf.length) {
        const len = buf.readUInt32BE(offset);
        offset += 4;
        if (offset + len > buf.length) {
          res.status(400).json({ error: 'Truncated frame payload' });
          return;
        }
        const frameBuf = buf.subarray(offset, offset + len);
        offset += len;
        job.frameCount += 1;
        const frameName = `frame_${String(job.frameCount).padStart(6, '0')}.jpg`;
        fs.writeFileSync(path.join(job.dir, frameName), frameBuf);
        added += 1;
      }

      res.json({ added, totalFrames: job.frameCount });
    },
  );

  // 3. Receive WAV audio track for the export job
  app.post(
    '/api/export/:jobId/audio',
    express.raw({ type: 'application/octet-stream', limit: '128mb' }),
    (req: Request, res: Response) => {
      const jobId = String(req.params.jobId);
      const job = exportJobs.get(jobId);
      if (!job) {
        res.status(404).json({ error: 'Export job not found' });
        return;
      }
      const buf = req.body as Buffer;
      if (!Buffer.isBuffer(buf) || buf.length === 0) {
        res.status(400).json({ error: 'Empty audio buffer' });
        return;
      }
      fs.writeFileSync(path.join(job.dir, 'audio.wav'), buf);
      job.hasAudio = true;
      res.json({ ok: true });
    },
  );

  // 4. Encode frames + audio to H.264 1920x1080 30fps MP4 via FFmpeg
  app.post('/api/export/:jobId/finalize', (req: Request, res: Response) => {
    const jobId = String(req.params.jobId);
    const job = exportJobs.get(jobId);
    if (!job) {
      res.status(404).json({ error: 'Export job not found' });
      return;
    }
    if (job.frameCount === 0) {
      res.status(400).json({ error: 'No frames uploaded' });
      return;
    }

    const outPath = path.join(job.dir, 'output.mp4');
    const args: string[] = [
      '-y',
      '-framerate',
      String(job.fps),
      '-i',
      path.join(job.dir, 'frame_%06d.jpg'),
    ];

    if (job.hasAudio) {
      args.push('-i', path.join(job.dir, 'audio.wav'));
    }

    args.push(
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '17',
      '-pix_fmt',
      'yuv420p',
      '-s',
      '1920x1080',
      '-r',
      String(job.fps),
    );

    if (job.hasAudio) {
      args.push('-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest');
    }

    args.push('-movflags', '+faststart', outPath);

    const ff = spawn('ffmpeg', args);
    let stderr = '';
    ff.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    ff.on('error', (err) => {
      res.status(500).json({ error: `Failed to start ffmpeg: ${err.message}` });
    });

    ff.on('close', (code) => {
      if (code !== 0 || !fs.existsSync(outPath)) {
        res.status(500).json({ error: `FFmpeg failed (code ${code}): ${stderr.slice(-600)}` });
        return;
      }

      res.download(outPath, 'RREF_Documentary_1080p30.mp4', (err) => {
        fs.rmSync(job.dir, { recursive: true, force: true });
        exportJobs.delete(jobId);
        if (err && !res.headersSent) {
          res.status(500).end();
        }
      });
    });
  });

  // Cancel / cleanup endpoint
  app.delete('/api/export/:jobId', (req: Request, res: Response) => {
    const jobId = String(req.params.jobId);
    const job = exportJobs.get(jobId);
    if (job) {
      fs.rmSync(job.dir, { recursive: true, force: true });
      exportJobs.delete(jobId);
    }
    res.json({ ok: true });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RREF Documentary server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
