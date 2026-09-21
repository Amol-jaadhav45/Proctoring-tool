import dotenv from 'dotenv';
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { initSocket } from './socket';
import sfuRouter from './routes/sfu';
import violationsRouter from './routes/violations';
import profileRouter from './routes/profile';
import { initMediasoup } from './services/mediasoup-service';
import { initEventBus } from './services/event-bus';
import { validateEnv } from './lib/validateEnv';

validateEnv();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), env: isProd ? 'production' : 'development' });
});

// API Routes (before static)
app.use('/api/sfu', sfuRouter);
app.use('/api/violations', violationsRouter);
app.use('/api/profile', profileRouter);

// Serve client in production (unified deployment)
const clientDist = path.join(process.cwd(), 'client/dist');
if (isProd) {
  app.use(express.static(clientDist, { maxAge: '1d' }));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.send('Proctoring System Server is running');
  });
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server] Error:', err);
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

async function start() {
  try {
    await initMediasoup();
    await initEventBus();
    initSocket(io);

    const PORT = Number(process.env.PORT) || 4000;
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} (0.0.0.0)`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
