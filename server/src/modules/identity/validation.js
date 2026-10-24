const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email is required and must be a string' };
  }
  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return { valid: false, message: 'Email address exceeds maximum length of 254 characters' };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, message: 'Invalid email address format' };
  }
  return { valid: true, value: trimmed.toLowerCase() };
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required and must be a string' };
  }
  if (password.length < 8 || password.length > 64) {
    return { valid: false, message: 'Password must be between 8 and 64 characters in length (inclusive)' };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true, value: password };
}

function validateDisplayName(displayName) {
  if (!displayName || typeof displayName !== 'string') {
    return { valid: false, message: 'Display name is required and must be a string' };
  }
  const trimmed = displayName.trim();
  if (trimmed.length < 2 || trimmed.length > 32) {
    return { valid: false, message: 'Display name must be between 2 and 32 characters in length (inclusive)' };
  }
  return { valid: true, value: trimmed };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateDisplayName
};
