import { Router } from 'express';
import { RunScanner } from '../services/runScanner';

const router = Router();
const scanner = new RunScanner();

router.get('/', async (req, res) => {
  const runs = await scanner.listRuns();
  res.json(runs);
});

router.get('/:id', async (req, res) => {
  const detail = await scanner.getRunDetail(req.params.id);
  if (!detail) {
    return res.status(404).json({ error: 'Run not found' });
  }
  res.json(detail);
});

export default router;
