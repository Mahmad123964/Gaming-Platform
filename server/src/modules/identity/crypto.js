const crypto = require('node:crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  const [salt, key] = storedHash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
}

function constantTimeDummyWork() {
  // Equalizes timing profile between registered and unregistered account branches
  const dummySalt = '0123456789abcdef0123456789abcdef';
  crypto.scryptSync('dummy_timing_padding', dummySalt, 64);
}

function generateId(prefix = 'usr') {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  constantTimeDummyWork,
  generateId
};
