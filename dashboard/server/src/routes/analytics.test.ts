import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsService } from '../services/analytics';
import { parseAnalyticsWindowDays } from './analytics';
import type { AnalyticsSummary } from '@shared/types';

test('AnalyticsService returns granular data from scanner', async () => {
  const mockRuns = [
    { id: 'TASK-001', title: 'ok', status: 'completed', updatedAt: '2026-06-01T10:00:00.000Z', runPath: 'runs/TASK-001' },
  ];
  
  const mockScanner = {
    listRuns: async () => mockRuns as any
  };

  const service = new AnalyticsService(mockScanner as any);
  const summary = await service.getSummary();

  assert.equal(summary.totalRuns, 1);
  assert.equal(summary.completedRuns, 1);
  assert.match(summary.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('parseAnalyticsWindowDays only allows 7, 14, or 30 day windows', () => {
  assert.equal(parseAnalyticsWindowDays(undefined), 7);
  assert.equal(parseAnalyticsWindowDays('7'), 7);
  assert.equal(parseAnalyticsWindowDays('14'), 14);
  assert.equal(parseAnalyticsWindowDays('30'), 30);
  assert.equal(parseAnalyticsWindowDays('9999'), 7);
  assert.equal(parseAnalyticsWindowDays('0'), 7);
  assert.equal(parseAnalyticsWindowDays('abc'), 7);
});
