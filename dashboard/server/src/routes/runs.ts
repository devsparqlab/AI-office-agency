import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { globalScanner } from '../services/runScanner';
import { resolveRunDir } from '../pathSecurity';
import { config } from '../config';
import type { RunFileResponse } from '@shared/types';

const router = Router();
// No slashes; traversal (e.g. "..") is additionally blocked by the path.relative check below.
const FILE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const MAX_FILE_BYTES = 256 * 1024;
// Share the single global scanner so its cache is consistent with analytics
// and gets invalidated by the watcher (see index.ts).
const scanner = globalScanner;

router.get('/', async (req, res) => {
  const runs = await scanner.listRuns();
  res.json(runs);
});

router.get('/:id', async (req, res) => {
  const dirResult = resolveRunDir(config.runsDir, req.params.id);
  if (!dirResult.ok) {
    return res.status(dirResult.code).json({ error: dirResult.error });
  }

  const detail = await scanner.getRunDetail(req.params.id);
  if (!detail) {
    return res.status(404).json({ error: 'Run not found' });
  }
  res.json(detail);
});

// Read one artifact file's content (path-validated, size-capped).
router.get('/:id/file/:name', async (req, res) => {
  const dir = resolveRunDir(config.runsDir, req.params.id);
  if (!dir.ok) return res.status(dir.code).json({ error: dir.error });

  const name = req.params.name;
  if (!FILE_NAME_PATTERN.test(name)) return res.status(400).json({ error: 'Invalid file name' });

  const filePath = path.resolve(dir.runDir, name);
  const rel = path.relative(dir.runDir, filePath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return res.status(400).json({ error: 'Path escapes the run directory' });
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return res.status(404).json({ error: 'Not a file' });
    const handle = await fs.open(filePath, 'r');
    try {
      const size = Math.min(stat.size, MAX_FILE_BYTES);
      const buf = Buffer.alloc(size);
      await handle.read(buf, 0, size, 0);
      const response: RunFileResponse = { name, content: buf.toString('utf8'), truncated: stat.size > MAX_FILE_BYTES };
      res.json(response);
    } finally {
      await handle.close();
    }
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

export default router;
