const fs = require('node:fs');
const path = require('node:path');

// 1. Lightweight native .env parser (avoids external dependency)
function loadEnv() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return;

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  } catch (err) {
    console.error('Warning: Failed to load .env file:', err.message);
  }
}

loadEnv();

// 2. Trusted Proxy Configuration & Helpers
function normalizeIp(ip) {
  if (!ip) return '';
  let clean = ip.trim().toLowerCase();
  if (clean.startsWith('::ffff:')) {
    clean = clean.slice(7);
  }
  return clean;
}

function getTrustedProxies() {
  const configured = (process.env.TRUSTED_PROXIES && process.env.TRUSTED_PROXIES !== 'undefined')
    ? process.env.TRUSTED_PROXIES
    : '127.0.0.1,::1';
  return configured
    .split(',')
    .map(p => normalizeIp(p))
    .filter(Boolean);
}

function isTrustedProxy(remoteIp) {
  const cleanRemote = normalizeIp(remoteIp);
  if (!cleanRemote) return false;

  const trusted = getTrustedProxies();
  if (trusted.includes(cleanRemote) || cleanRemote === 'localhost') {
    return true;
  }
  return false;
}

function isSecureRequest(req) {
  // In production, session cookies ALWAYS enforce the Secure flag
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  // Native TLS connection
  if (req.secure) {
    return true;
  }

  // Forwarded proto from an EXPLICITLY TRUSTED reverse proxy
  const remoteAddress = req.socket?.remoteAddress;
  if (isTrustedProxy(remoteAddress)) {
    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto.toLowerCase() === 'https') {
      return true;
    }
  }

  // Untrusted client spoofing is ignored
  return false;
}

function getClientIp(req) {
  const remoteAddress = req.socket?.remoteAddress || req.ip || '127.0.0.1';

  // Only trust X-Forwarded-For if request came from an explicitly trusted reverse proxy
  if (isTrustedProxy(remoteAddress)) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
  }

  return normalizeIp(remoteAddress) || '127.0.0.1';
}

module.exports = {
  loadEnv,
  normalizeIp,
  isTrustedProxy,
  isSecureRequest,
  getClientIp
};
