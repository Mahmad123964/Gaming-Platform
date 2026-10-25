const os = require('node:os');
const { getDb } = require('../../db');

class MetricsService {
  constructor() {
    this.requestBuffer = [];
    this.maxBufferSize = 10000;
    this.startTime = Date.now();
    this.telemetryAvailable = true; // AC-41.3: support toggling telemetry availability
    this.wsClientCount = 0;
    
    // CPU usage tracking state
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = Date.now();
    this.cachedCpuPercent = 0;

    // Periodically update CPU percent
    this._cpuInterval = setInterval(() => {
      this._updateCpuPercent();
    }, 2000);
    if (this._cpuInterval.unref) this._cpuInterval.unref();
  }

  _updateCpuPercent() {
    try {
      const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
      const currentTime = Date.now();
      const elapsedMs = currentTime - this.lastCpuTime;
      
      if (elapsedMs > 0) {
        // total microseconds of CPU time divided by total available microseconds across cores
        const totalMicros = (currentCpuUsage.user + currentCpuUsage.system);
        const elapsedMicros = elapsedMs * 1000 * Math.max(1, os.cpus().length);
        const percent = Math.min(100, Math.round((totalMicros / elapsedMicros) * 1000) / 10);
        this.cachedCpuPercent = isNaN(percent) ? 0 : percent;
      }
      this.lastCpuUsage = process.cpuUsage();
      this.lastCpuTime = currentTime;
    } catch (e) {
      this.cachedCpuPercent = 0;
    }
  }

  setTelemetryAvailable(available) {
    this.telemetryAvailable = Boolean(available);
  }

  isTelemetryAvailable() {
    return this.telemetryAvailable;
  }

  setWebSocketClientCount(count) {
    this.wsClientCount = Math.max(0, count);
  }

  incrementWebSocketClientCount() {
    this.wsClientCount++;
  }

  decrementWebSocketClientCount() {
    this.wsClientCount = Math.max(0, this.wsClientCount - 1);
  }

  recordRequest({ method, path, statusCode, durationMs, timestamp = Date.now() }) {
    if (this.requestBuffer.length >= this.maxBufferSize) {
      this.requestBuffer.shift();
    }
    this.requestBuffer.push({
      method: method ? method.toUpperCase() : 'GET',
      path: path || '/',
      statusCode: statusCode || 200,
      durationMs: Math.max(0, durationMs || 0),
      timestamp
    });
  }

  getWindowDurationMs(windowKey) {
    switch (windowKey) {
      case '5m': return 5 * 60 * 1000;
      case '15m': return 15 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      default: return 5 * 60 * 1000;
    }
  }

  getMetrics(windowKey = '5m') {
    // AC-41.3: If telemetry is unavailable, indicate missing data explicitly
    if (!this.telemetryAvailable) {
      return {
        telemetryAvailable: false,
        status: 'TELEMETRY_UNAVAILABLE',
        message: 'Telemetry data is unavailable. Metrics collection pipeline is offline.',
        window: windowKey,
        availability: null,
        latency: null,
        system: null,
        dependencies: null,
        timestamp: new Date().toISOString()
      };
    }

    const windowDurationMs = this.getWindowDurationMs(windowKey);
    const now = Date.now();
    const cutoff = now - windowDurationMs;

    // Filter samples in the requested window (AC-41.2)
    const samples = this.requestBuffer.filter(s => s.timestamp >= cutoff);
    const totalRequests = samples.length;

    let count2xx = 0;
    let count3xx = 0;
    let count4xx = 0;
    let count5xx = 0;
    const durations = [];

    for (const s of samples) {
      if (s.statusCode >= 500) count5xx++;
      else if (s.statusCode >= 400) count4xx++;
      else if (s.statusCode >= 300) count3xx++;
      else if (s.statusCode >= 200) count2xx++;
      durations.push(s.durationMs);
    }

    durations.sort((a, b) => a - b);

    const getPercentile = (p) => {
      if (durations.length === 0) return 0;
      const idx = Math.min(durations.length - 1, Math.floor((p / 100) * durations.length));
      return Math.round(durations[idx] * 10) / 10;
    };

    const avgLatency = durations.length > 0
      ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 10) / 10
      : 0;

    const errorRatePercent = totalRequests > 0
      ? Math.round((count5xx / totalRequests) * 1000) / 10
      : 0.0;

    // Availability SLI: (Total Requests - 5xx Errors) / Total Requests * 100%
    const availabilityPercent = totalRequests > 0
      ? Math.round(((totalRequests - count5xx) / totalRequests) * 1000) / 10
      : 100.0;

    const windowSeconds = windowDurationMs / 1000;
    const rps = Math.round((totalRequests / windowSeconds) * 100) / 100;

    // Process memory usage
    const mem = process.memoryUsage();
    const rssMB = Math.round((mem.rss / 1024 / 1024) * 10) / 10;
    const heapUsedMB = Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10;
    const heapTotalMB = Math.round((mem.heapTotal / 1024 / 1024) * 10) / 10;

    // Database health & latency check
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;
    try {
      const db = getDb();
      const dbStart = performance.now();
      const dbCheck = db.get('SELECT 1 as ping');
      dbLatencyMs = Math.round((performance.now() - dbStart) * 10) / 10;
      if (!dbCheck || dbCheck.ping !== 1) {
        dbStatus = 'degraded';
      }
    } catch (e) {
      dbStatus = 'unhealthy';
    }

    // Overall system status indicator
    let overallHealth = 'HEALTHY';
    if (dbStatus !== 'healthy' || errorRatePercent >= 10.0) {
      overallHealth = 'CRITICAL';
    } else if (errorRatePercent >= 2.0 || avgLatency > 300) {
      overallHealth = 'DEGRADED';
    }

    return {
      telemetryAvailable: true,
      window: windowKey,
      windowDurationSeconds: windowSeconds,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((now - this.startTime) / 1000),
      overallHealth,
      availability: {
        sliPercent: availabilityPercent,
        totalRequests,
        requestsPerSecond: rps,
        successfulRequests: totalRequests - count5xx,
        serverErrors: count5xx,
        clientErrors: count4xx,
        errorRatePercent
      },
      latency: {
        avgMs: avgLatency,
        p50Ms: getPercentile(50),
        p95Ms: getPercentile(95),
        p99Ms: getPercentile(99),
        minMs: durations.length > 0 ? durations[0] : 0,
        maxMs: durations.length > 0 ? durations[durations.length - 1] : 0
      },
      system: {
        cpuPercent: this.cachedCpuPercent,
        memory: {
          rssMB,
          heapUsedMB,
          heapTotalMB
        },
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
      },
      dependencies: {
        database: {
          engine: 'SQLite (Node.js DatabaseSync)',
          status: dbStatus,
          queryLatencyMs: dbLatencyMs
        },
        webSocket: {
          status: 'online',
          activeConnections: this.wsClientCount
        }
      }
    };
  }

  clearBuffer() {
    this.requestBuffer = [];
  }
}

// Singleton instance
let instance = null;
function getMetricsService() {
  if (!instance) {
    instance = new MetricsService();
  }
  return instance;
}

module.exports = {
  MetricsService,
  getMetricsService
};
