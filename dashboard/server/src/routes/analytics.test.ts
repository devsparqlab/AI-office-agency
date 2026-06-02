import test from 'node:test';
import assert from 'node:assert/strict';
import { createAnalyticsHandler } from './analytics';
import type { AnalyticsResponse } from '@shared/types';

test('createAnalyticsHandler returns analytics from injected run data', async () => {
  let statusCode = 200;
  let jsonPayload: unknown;
  let getAnalyticsCalls = 0;

  const response: AnalyticsResponse = {
    generatedAt: '2026-06-02T00:00:00.000Z',
    windowDays: 7,
    summary: {
      totalRuns: 1,
      completedRuns: 1,
      failedRuns: 0,
      blockedRuns: 0,
      runningRuns: 0,
      successRate: 1,
      failureRate: 0,
      blockedRate: 0,
      healthScore: {
        score: 100,
        status: 'ok',
        factors: [],
      },
    },
    trends: [],
    topFailureReasons: [],
  };

  const handler = createAnalyticsHandler({
    getAnalytics: async () => {
      getAnalyticsCalls += 1;
      return response;
    },
  });

  await handler(
    {} as never,
    {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        jsonPayload = payload;
        return this;
      },
    } as never,
  );

  assert.equal(statusCode, 200);
  assert.equal(getAnalyticsCalls, 1);
  assert.deepEqual(jsonPayload, response);
});

test('createAnalyticsHandler returns 500 when analytics dependencies fail', async () => {
  let statusCode = 200;
  let jsonPayload: unknown;
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const handler = createAnalyticsHandler({
      getAnalytics: async () => {
        throw new Error('boom');
      },
    });

    await handler(
      {} as never,
      {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(payload: unknown) {
          jsonPayload = payload;
          return this;
        },
      } as never,
    );

    assert.equal(statusCode, 500);
    assert.deepEqual(jsonPayload, { error: 'Failed to build analytics' });
  } finally {
    console.error = originalConsoleError;
  }
});
