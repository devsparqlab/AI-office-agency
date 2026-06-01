import { Router } from 'express';
import { globalWatcher } from '../services/watcher';
import { config } from '../config';

const router = Router();

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const onUpdate = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  globalWatcher.on('update', onUpdate);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, config.sseHeartbeatMs);

  req.on('close', () => {
    globalWatcher.off('update', onUpdate);
    clearInterval(heartbeat);
  });
});

export default router;
