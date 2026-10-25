const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { getDb } = require('./db');
const { isTrustedProxy } = require('./config');

function createApp() {
  const app = express();
  const db = getDb();
  const startTime = Date.now();

  // Reverse Proxy Security: Accept proxy metadata only from explicitly trusted proxies
  app.set('trust proxy', isTrustedProxy);

  app.use(express.json());

  // Request logger middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
      }
    });
    next();
  });

  // CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Static files: serve client/dist if built (React 19 + TS), otherwise fallback to public
  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  const publicDir = path.join(__dirname, '..', '..', 'public');
  const staticPath = fs.existsSync(clientDist) ? clientDist : publicDir;
  app.use(express.static(staticPath));

  // Liveness check (SRE requirement)
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString()
    });
  });

  // Readiness check (SRE requirement - verifies DB and subsystems)
  app.get('/api/health', (req, res) => {
    const isDbHealthy = db.healthCheck();
    const mem = process.memoryUsage();

    if (!isDbHealthy) {
      return res.status(503).json({
        status: 'DEGRADED',
        database: 'unhealthy',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      memory: {
        rssMB: Math.round(mem.rss / 1024 / 1024),
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024)
      },
      timestamp: new Date().toISOString()
    });
  });

  // Mount Identity & Authentication routes (Sprint 01: EP01-01, EP01-02, EP01-03, EP11-01)
  const { authRouter } = require('./modules/identity');
  app.use('/api/v1/auth', authRouter);

  // Mount Game Catalog & Discovery routes (Sprint 02: EP02-01, EP02-02, EP02-03, EP02-04)
  const { catalogRouter } = require('./modules/catalog');
  app.use('/api/v1/catalog', catalogRouter);

  // Mount Content Administration routes (Sprint 03: EP03-02, EP10-01, EP10-02, EP10-03, EP11-02)
  const { adminRouter } = require('./modules/contentAdmin');
  app.use('/api/v1/admin', adminRouter);

  // Mount Game Launch & Single-Player Session routes (Sprint 04: EP03-01, EP03-03, EP03-04, EP04-01, EP04-03)
  const { gameLaunchRouter, directLaunchGuard } = require('./modules/gameLaunch');
  app.use('/api/v1', gameLaunchRouter);

  // Direct game launch asset protection (EP03-04, AC-12.1)
  // Direct navigation without a valid session launch ticket is rejected
  app.get('/games/:slug/index.html', directLaunchGuard, (req, res) => {
    res.status(200).json({
      status: 'AUTHORIZED',
      message: 'Launch ticket verified. Initializing game runtime container.',
      ticket: req.launchTicketPayload,
      timestamp: new Date().toISOString()
    });
  });

  // Detailed platform status
  app.get('/api/v1/status', (req, res) => {
    res.status(200).json({
      platform: 'Online Gaming Platform',
      version: '0.5.0',
      activeSprint: '04',
      phase: '1',
      environment: process.env.NODE_ENV || 'development',
      features: {
        gameLaunch: 'active (Sprint 04: Game Launching, Single-Player Sessions, Device Compatibility, First Playable Engine)',
        contentAdministration: 'active (Sprint 03: Game Registration, Metadata Editing, Publication Workflow, Licensing Clearance, Audit Trail)',
        gameCatalog: 'active (Sprint 02: Browse, Search, Category Filter, Game Details)',
        authentication: 'active (Sprint 01: Registration, Login, Recovery, Rate Limiting)',
        multiplayer: 'pending (Sprint 08)',
        payments: 'pending (Sprint 12)',
        stagingPipeline: 'active (Sprint 00)'
      },
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler for API routes
  app.use('/api', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Endpoint ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled application error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

module.exports = { createApp };
