const http = require('node:http');
const { WebSocketServer } = require('ws');
const { createApp } = require('./app');

// CLI args parsing helper: --port=5050 --env=staging
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, val] = arg.slice(2).split('=');
    acc[key] = val || true;
  }
  return acc;
}, {});

const PORT = parseInt(args.port || process.env.PORT || '3000', 10);
const ENV = args.env || process.env.NODE_ENV || 'development';
process.env.NODE_ENV = ENV;
process.env.PORT = PORT.toString();

const app = createApp();
const server = http.createServer(app);

// WebSocket server setup for real-time multiplayer lobbies (EP-05/06)
const { getMetricsService } = require('./modules/operations');
const { getRealtimeService } = require('./modules/multiplayer');
const metricsService = getMetricsService();
const realtimeService = getRealtimeService();
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  metricsService.incrementWebSocketClientCount();
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);
  }

  // Hand off socket to RealtimeSessionService
  realtimeService.handleConnection(ws, req);

  ws.on('close', () => {
    metricsService.decrementWebSocketClientCount();
    if (process.env.NODE_ENV !== 'test') {
      console.log('[WS] Client disconnected');
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  ONLINE GAMING PLATFORM SERVER ACTIVE`);
  console.log(`  Environment : ${ENV.toUpperCase()}`);
  console.log(`  HTTP URL    : http://localhost:${PORT}`);
  console.log(`  WS URL      : ws://localhost:${PORT}/ws`);
  console.log(`  Health API  : http://localhost:${PORT}/api/health`);
  console.log(`  Status API  : http://localhost:${PORT}/api/v1/status`);
  console.log(`====================================================`);
});

// Graceful termination handling
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing server...');
  wss.close();
  server.close(() => {
    console.log('Server terminated cleanly.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, closing server...');
  wss.close();
  server.close(() => {
    console.log('Server terminated cleanly.');
    process.exit(0);
  });
});

module.exports = { server, wss };
