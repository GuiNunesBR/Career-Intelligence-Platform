import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import { app } from './server/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const distPath = path.resolve(__dirname, 'dist');

// Serve static assets in production
app.use(express.static(distPath));

app.get('*', (_req, res, next) => {
  if (_req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Career Lake Fullstack Server running on port ${PORT}`);
});
