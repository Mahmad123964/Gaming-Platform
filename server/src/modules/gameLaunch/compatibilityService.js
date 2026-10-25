/**
 * Device & Browser Compatibility Service
 * Traceability: EP03-03, AC-11.1, AC-11.2, AC-11.3
 */

class DeviceCompatibilityService {
  constructor() {}

  /**
   * Evaluate client compatibility based on User-Agent and client capability payload
   * @param {Object} options
   * @param {string} options.userAgent
   * @param {Object} options.clientCapabilities
   * @returns {Object} Compatibility evaluation result
   */
  checkCompatibility({ userAgent = '', clientCapabilities = null } = {}) {
    const ua = (userAgent || '').toLowerCase();

    // 1. Explicit Client Capability Checks (if provided by browser telemetry)
    if (clientCapabilities && typeof clientCapabilities === 'object') {
      if (clientCapabilities.hasCanvas === false) {
        return {
          supported: false,
          status: 'UNSUPPORTED_DEVICE',
          code: 'CANVAS_UNSUPPORTED',
          message: 'Unsupported Browser: Your browser lacks HTML5 Canvas rendering support required for interactive gameplay (AC-11.1).',
          details: {
            missingFeature: 'HTML5 Canvas 2D',
            recommendation: 'Please upgrade to a modern browser such as Chrome, Edge, Firefox, or Safari.'
          }
        };
      }

      if (clientCapabilities.screenWidth && clientCapabilities.screenWidth < 300) {
        return {
          supported: false,
          status: 'UNSUPPORTED_DEVICE',
          code: 'VIEWPORT_TOO_SMALL',
          message: 'Unsupported Display: Minimum screen width of 300px is required for game viewport controls (AC-11.1).',
          details: {
            screenWidth: clientCapabilities.screenWidth,
            minRequired: 300
          }
        };
      }
    }

    // 2. Known Incompatible Browsers & Environments (AC-11.1)
    const isLegacyIE = ua.includes('msie') || ua.includes('trident');
    const isTextBrowser = ua.includes('lynx') || ua.includes('links') || ua.includes('w3m');
    const isUnsupportedBot = ua.includes('googlebot') || ua.includes('bingbot') || ua.includes('crawler');

    if (isLegacyIE) {
      return {
        supported: false,
        status: 'UNSUPPORTED_DEVICE',
        code: 'LEGACY_BROWSER',
        message: 'Unsupported Browser: Internet Explorer is not supported. NexusPlay requires a modern ECMAScript 2020+ compatible browser with HTML5 Canvas (AC-11.1).',
        details: {
          detectedEngine: 'Trident / MSIE',
          recommendation: 'Please launch NexusPlay using Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari.'
        }
      };
    }

    if (isTextBrowser) {
      return {
        supported: false,
        status: 'UNSUPPORTED_DEVICE',
        code: 'TEXT_BROWSER',
        message: 'Unsupported Environment: Text-mode browsers cannot render 2D canvas graphical gameplay (AC-11.1).',
        details: {
          detectedEngine: 'Text Terminal',
          recommendation: 'Please switch to a graphical browser with GPU acceleration.'
        }
      };
    }

    // 3. Known Supported Modern Browsers (AC-11.2)
    const isModernChrome = ua.includes('chrome') || ua.includes('crios');
    const isModernFirefox = ua.includes('firefox') || ua.includes('fxios');
    const isModernSafari = ua.includes('safari') && !ua.includes('chrome');
    const isModernEdge = ua.includes('edg');
    const isMobileDevice = ua.includes('android') || ua.includes('iphone') || ua.includes('ipad');

    if (isModernEdge || isModernChrome || isModernFirefox || isModernSafari) {
      return {
        supported: true,
        status: 'SUPPORTED',
        code: 'COMPATIBLE',
        message: 'Client device and browser are fully compatible with NexusPlay Obsidian Arcade runtime (AC-11.2).',
        details: {
          browserType: isModernEdge ? 'Edge' : isModernChrome ? 'Chrome' : isModernFirefox ? 'Firefox' : 'Safari',
          isMobile: isMobileDevice,
          canvasAcceleration: true
        }
      };
    }

    // 4. Inconclusive Detection Fallback (AC-11.3)
    // If User-Agent is unknown or empty, present the agreed fallback outcome
    return {
      supported: true, // permitted with advisory warning
      status: 'INCONCLUSIVE',
      code: 'FALLBACK_MODE',
      message: 'Browser environment could not be definitively verified. Launching in standard compatibility fallback mode (AC-11.3).',
      details: {
        fallbackEnabled: true,
        advisory: 'If you experience input or rendering anomalies, please ensure hardware acceleration is enabled.'
      }
    };
  }
}

let instance = null;
function getCompatibilityService() {
  if (!instance) {
    instance = new DeviceCompatibilityService();
  }
  return instance;
}

module.exports = {
  DeviceCompatibilityService,
  getCompatibilityService
};
