const catalogRouter = require('./routes');
const { GameCatalogService, getCatalogService } = require('./catalogService');

module.exports = {
  catalogRouter,
  GameCatalogService,
  getCatalogService
};
