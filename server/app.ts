import express from 'express';
import { apiRouter } from './routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { securityHeaders } from './middleware/security.middleware.js';
import { structuredLogger } from './middleware/logger.middleware.js';
// Initialize scheduler and worker
import './scheduler/scheduler.js';
import './worker.js';

export const app = express();

app.disable('x-powered-by');
// Behind one reverse proxy in production (Render): use X-Forwarded-For for the client IP
if (process.env.NODE_ENV === 'production') app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use(structuredLogger);
app.use('/api', apiRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'career-lake-api', timestamp: new Date().toISOString() });
});

app.use(errorHandler);
