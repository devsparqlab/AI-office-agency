import type { Request, Response } from 'express';
import { Router } from 'express';
import { AnalyticsService } from '../services/analytics';
import type { AnalyticsResponse } from '@shared/types';

export interface AnalyticsRouteDeps {
  getAnalytics: () => Promise<AnalyticsResponse>;
}

const defaultDeps: AnalyticsRouteDeps = {
  getAnalytics: () => new AnalyticsService().getAnalytics(),
};

export function createAnalyticsHandler(deps: AnalyticsRouteDeps = defaultDeps) {
  return async function analyticsHandler(_req: Request, res: Response) {
    try {
      res.json(await deps.getAnalytics());
    } catch (error) {
      console.error('Failed to build analytics:', error);
      res.status(500).json({ error: 'Failed to build analytics' });
    }
  };
}

export function createAnalyticsRouter(deps: AnalyticsRouteDeps = defaultDeps) {
  const router = Router();
  router.get('/', createAnalyticsHandler(deps));
  return router;
}

export default createAnalyticsRouter();
