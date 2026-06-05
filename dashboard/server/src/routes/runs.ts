import { Router } from 'express';
import { globalScanner } from '../services/runScanner';
import { resolveRunDir } from '../pathSecurity';
import { config } from '../config';

const router = Router();
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

export default router;
