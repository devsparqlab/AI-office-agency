import { Router } from 'express';
import { config } from '../config';
import { globalWatcher } from '../services/watcher';
import { HealthStatus } from '../../../shared/types';
import fs from 'fs/promises';

const router = Router();

router.get('/', async (req, res) => {
  let runsDirExists = false;
  let logsDirExists = false;

  try {
    await fs.access(config.runsDir);
    runsDirExists = true;
  } catch (e) {}

  try {
    await fs.access(config.logsDir);
    logsDirExists = true;
  } catch (e) {}

  const status: HealthStatus = {
    ok: runsDirExists,
    aiOfficeRoot: config.aiOfficeRoot,
    runsDirExists,
    logsDirExists,
    watcherActive: globalWatcher.isActive()
  };

  res.json(status);
});

export default router;
