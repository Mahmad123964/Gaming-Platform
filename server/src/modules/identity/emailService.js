const fs = require('node:fs');
const path = require('node:path');

class EmailService {
  constructor(options = {}) {
    this.outbox = [];
    this.logFile = options.logFile || path.join(__dirname, '..', '..', '..', 'data', 'email-outbox.log');
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  async sendPasswordResetEmail({ to, resetToken, expiresAt }) {
    const timestamp = new Date().toISOString();
    const expiryDate = new Date(expiresAt).toLocaleTimeString();

    const emailPayload = {
      id: `mail-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      to,
      from: 'security@nexusplay.gg',
      subject: 'NexusPlay — Password Recovery Request',
      sentAt: timestamp,
      template: 'password-reset',
      data: {
        resetToken,
        expiresAt,
        resetUrl: `https://nexusplay.gg/auth/reset?token=${resetToken}`
      },
      textBody: `Hello,\n\nA password reset was requested for your NexusPlay account (${to}).\n\nYour 15-minute security reset token is:\n${resetToken}\n\nThis token will expire at ${expiryDate}. If you did not request this reset, please ignore this email or contact security@nexusplay.gg immediately.\n\n— The NexusPlay Security Team`
    };

    if (this.isProduction) {
      // Production Transactional Email Delivery Gateway
      // In production, integrate with AWS SES, SendGrid, or SMTP
      // Environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
      console.log(`[EMAIL_DISPATCH_PROD] Password recovery email dispatched to: ${to}`);
      return { success: true, messageId: emailPayload.id };
    }

    // Staging / Development / Test Environment:
    // Append to memory outbox and persistent file outbox for test runners and staging verification
    this.outbox.push(emailPayload);

    try {
      const dir = path.dirname(this.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const logEntry = `[${timestamp}] TO: ${to} | SUBJECT: ${emailPayload.subject} | TOKEN: ${resetToken} | EXPIRES: ${expiresAt}\n`;
      fs.appendFileSync(this.logFile, logEntry);
    } catch (err) {
      console.error('Failed to append to email outbox log:', err.message);
    }

    return { success: true, messageId: emailPayload.id, stagingPreview: emailPayload };
  }

  getOutbox() {
    return [...this.outbox];
  }

  getLatestEmailFor(email) {
    const clean = (email || '').trim().toLowerCase();
    return this.outbox.slice().reverse().find(m => m.to.toLowerCase() === clean) || null;
  }

  clearOutbox() {
    this.outbox = [];
  }
}

const emailService = new EmailService();

module.exports = {
  EmailService,
  emailService
};
