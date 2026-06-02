import express from 'express';
import cors from 'cors';
import { config } from './config';
import healthRoutes from './routes/health';
import runRoutes from './routes/runs';
import eventRoutes from './routes/events';
import logRoutes from './routes/logs';
import analyticsRoutes from './routes/analytics';
import { globalWatcher } from './services/watcher';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/analytics', analyticsRoutes);

// Start Watcher
globalWatcher.start();

app.listen(config.port, () => {
  console.log(`AI Dashboard Server running on http://localhost:${config.port}`);
  console.log(`Watching runs in: ${config.runsDir}`);
});
