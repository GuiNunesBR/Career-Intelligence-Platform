import express from 'express';
import { apiRouter } from './routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { securityHeaders } from './middleware/security.middleware.js';
import { structuredLogger } from './middleware/logger.middleware.js';
// Initialize scheduler and worker
import './scheduler/scheduler.js';
import './worker.js';

export const app = express();

app.use(securityHeaders);
app.use(express.json({ limit: '10mb' }));
app.use(structuredLogger);
app.use('/api', apiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'career-lake-api', timestamp: new Date().toISOString() });
});

app.use(errorHandler);
