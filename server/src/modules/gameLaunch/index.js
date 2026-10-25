const { GameLaunchService, getGameLaunchService } = require('./gameLaunchService');
const { SessionService, getSessionService } = require('./sessionService');
const { DeviceCompatibilityService, getCompatibilityService } = require('./compatibilityService');
const { gameLaunchRouter, directLaunchGuard } = require('./routes');

module.exports = {
  GameLaunchService,
  getGameLaunchService,
  SessionService,
  getSessionService,
  DeviceCompatibilityService,
  getCompatibilityService,
  gameLaunchRouter,
  directLaunchGuard
};
