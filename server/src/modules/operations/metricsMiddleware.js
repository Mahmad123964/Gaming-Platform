const { getMetricsService } = require('./metricsService');

function metricsMiddleware(req, res, next) {
  const start = performance.now();
  const metricsService = getMetricsService();

  // Listen to response finish event
  res.on('finish', () => {
    try {
      const durationMs = Math.round((performance.now() - start) * 10) / 10;
      metricsService.recordRequest({
        method: req.method,
        path: req.baseUrl ? `${req.baseUrl}${req.path}` : req.path,
        statusCode: res.statusCode,
        durationMs,
        timestamp: Date.now()
      });
    } catch (e) {
      // Never let metrics tracking crash the request
    }
  });

  next();
}

module.exports = { metricsMiddleware };
