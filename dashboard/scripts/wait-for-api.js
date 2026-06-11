#!/usr/bin/env node

const DEFAULT_HEALTH_URL = 'http://localhost:4310/api/health';
const healthUrl = process.env.DASHBOARD_HEALTH_URL || DEFAULT_HEALTH_URL;
const timeoutMs = Number.parseInt(process.env.DASHBOARD_WAIT_TIMEOUT_MS || '30000', 10);
const intervalMs = Number.parseInt(process.env.DASHBOARD_WAIT_INTERVAL_MS || '500', 10);
const startedAt = Date.now();

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForApi() {
  process.stdout.write(`Waiting for dashboard API at ${healthUrl}...\n`);

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) {
        process.stdout.write('Dashboard API is ready.\n');
        return;
      }
    } catch {
      // Server is not listening yet.
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for dashboard API at ${healthUrl}`);
}

waitForApi().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
