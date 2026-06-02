import { Router, Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics';

const router = Router();
const service = new AnalyticsService();

router.get('/', async (req, res) => {
  try {
    const windowDays = parseInt(req.query.days as string, 10) || 7;
    res.json(await service.getAnalytics({ windowDays }));
  } catch (error) {
    console.error('Failed to fetch combined analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const windowDays = parseInt(req.query.days as string, 10) || 7;
    res.json(await service.getSummary({ windowDays }));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

router.get('/trends', async (req, res) => {
  try {
    const windowDays = parseInt(req.query.days as string, 10) || 7;
    res.json(await service.getTrends({ windowDays }));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics trends' });
  }
});

router.get('/failures', async (req, res) => {
  try {
    const windowDays = parseInt(req.query.days as string, 10) || 7;
    res.json(await service.getFailures({ windowDays }));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch failure insights' });
  }
});

router.get('/agents', async (req, res) => {
  try {
    const windowDays = parseInt(req.query.days as string, 10) || 7;
    res.json(await service.getAgents({ windowDays }));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent metrics' });
  }
});

router.get('/long-running', async (req, res) => {
  try {
    res.json(await service.getLongRunning());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch long-running tasks' });
  }
});

export default router;
