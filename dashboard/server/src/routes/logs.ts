import { Router } from 'express';
import { config } from '../config';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

router.get('/:taskId/:logFile', async (req, res) => {
  const { taskId, logFile } = req.params;
  const logPath = path.join(config.runsDir, taskId, logFile);

  try {
    const stats = await fs.stat(logPath);
    const content = await fs.readFile(logPath, 'utf8');
    const lines = content.split('\n');
    const tail = lines.slice(-config.logTailLines).join('\n');
    res.json({ content: tail, size: stats.size });
  } catch (err) {
    res.status(404).json({ error: 'Log not found' });
  }
});

export default router;
