import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './src/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.NODE_ENV === 'production' && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function setupViteOrStatic() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ProjectFlow Server running at http://0.0.0.0:${PORT}`);
  });
}

// Only start the standalone HTTP listener when not running in Vercel Serverless Function
if (process.env.VERCEL !== '1' && !process.env.VERCEL_ENV) {
  setupViteOrStatic().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
