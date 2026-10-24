const express = require('express');
const { getCatalogService } = require('./catalogService');
const { getDb } = require('../../db');

const router = express.Router();

/**
 * GET /api/v1/catalog/games
 * Browse published games with optional search, category filter, sorting, and pagination.
 * Excludes unpublished games unconditionally (AC-5.2, AC-6.3).
 */
router.get('/games', (req, res) => {
  try {
    const catalogService = getCatalogService(getDb());
    const { page, limit, q, search, category, sort } = req.query;

    const searchQuery = (q !== undefined ? q : search) || '';

    const result = catalogService.getPublishedGames({
      page,
      limit,
      search: searchQuery,
      category,
      sort
    });

    res.status(200).json({
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[CatalogRoute] Failed to retrieve games:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve catalog games',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/catalog/categories
 * List all game categories with published game counts.
 */
router.get('/categories', (req, res) => {
  try {
    const catalogService = getCatalogService(getDb());
    const categories = catalogService.getCategories();

    res.status(200).json({
      categories,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[CatalogRoute] Failed to retrieve categories:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve catalog categories',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/catalog/games/:idOrSlug
 * Retrieve game details by id or unique slug.
 * Returns HTTP 404 if game is unpublished or does not exist (AC-8.3).
 */
router.get('/games/:idOrSlug', (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const catalogService = getCatalogService(getDb());
    const game = catalogService.getPublishedGameByIdOrSlug(idOrSlug);

    if (!game) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Game not found or unavailable',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      game,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[CatalogRoute] Failed to retrieve game details:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve game details',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
