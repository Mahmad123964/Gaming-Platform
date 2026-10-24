const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const { getDb } = require('./db');

function createApp() {
  const app = express();
  const db = getDb();
  const startTime = Date.now();

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

  // Detailed platform status
  app.get('/api/v1/status', (req, res) => {
    res.status(200).json({
      platform: 'Online Gaming Platform',
      version: '0.1.0',
      activeSprint: '00',
      phase: '1',
      environment: process.env.NODE_ENV || 'development',
      features: {
        gameCatalog: 'pending (Sprint 02)',
        authentication: 'pending (Sprint 01)',
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
