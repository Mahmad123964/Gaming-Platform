const express = require('express');
const { getLobbyService } = require('./lobbyService');
const { getRealtimeService } = require('./realtimeService');
const { requireAuth } = require('../identity/middleware');

const router = express.Router();
const lobbyService = getLobbyService();
const realtimeService = getRealtimeService();

/**
 * POST /api/v1/lobbies
 * EP05-01 / AC-16.1: Create a two-player private lobby.
 * AC-16.2: Rejects ineligible games.
 */
router.post('/', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { gameId, gameSlug, gameIdOrSlug } = req.body;

    const gameTarget = gameId || gameSlug || gameIdOrSlug;
    if (!gameTarget) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'gameId or gameSlug is required to create a lobby.'
      });
    }

    const lobby = lobbyService.createLobby({
      gameIdOrSlug: gameTarget,
      hostPlayerId: player.id
    });

    realtimeService.subscribePlayerToRoom(player.id, lobby.id);

    return res.status(201).json({
      success: true,
      message: 'Lobby created successfully. Share the invitation code with your opponent.',
      lobby
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'LobbyCreationError',
      message: err.message,
      eligibilityDetails: err.eligibilityDetails || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/lobbies/join
 * EP05-02 / AC-17.1: Join lobby with invitation code.
 * AC-17.2: Rejects invalid or expired code.
 * AC-17.3 / AC-16.3: Rejects full lobby.
 */
router.post('/join', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { code } = req.body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A valid invitation code is required.'
      });
    }

    const lobby = lobbyService.joinLobby({
      code: code.trim(),
      playerId: player.id
    });

    // Broadcast updated state to room participants
    realtimeService.broadcastToRoom(lobby.id, {
      type: 'LOBBY_STATE_CHANGED',
      lobbyId: lobby.id,
      status: lobby.status,
      playerCount: lobby.playerCount,
      maxPlayers: lobby.maxPlayers,
      isFull: lobby.isFull,
      participants: lobby.participants,
      timestamp: new Date().toISOString()
    });

    realtimeService.subscribePlayerToRoom(player.id, lobby.id);

    realtimeService.broadcastToRoom(lobby.id, {
      type: 'PLAYER_JOINED',
      payload: {
        lobby,
        player: {
          id: player.id,
          displayName: player.displayName
        }
      },
      lobby,
      timestamp: new Date().toISOString()
    });

    realtimeService.broadcastToRoom(lobby.id, {
      type: 'LOBBY_MEMBER_JOINED',
      lobbyId: lobby.id,
      joinedPlayer: {
        id: player.id,
        displayName: player.displayName
      },
      participants: lobby.participants,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: `Joined lobby for "${lobby.game.title}".`,
      lobby
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'JoinLobbyError',
      message: err.message,
      capacityDetails: err.capacityDetails || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/lobbies/code/:code
 * Lookup lobby by invitation code (case-insensitive)
 */
router.get('/code/:code', (req, res) => {
  try {
    const code = req.params.code;
    const lobby = lobbyService.getLobbyByCode(code);

    if (!lobby) {
      return res.status(404).json({
        error: 'INVALID_INVITATION_CODE',
        message: `No active lobby found for invitation code '${code}'.`
      });
    }

    return res.status(200).json({ lobby });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'LookupError',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/lobbies/:id
 * EP05-03: View lobby status (waiting, full, active)
 * AC-18.1: waiting
 * AC-18.2: full
 * AC-18.3: active
 */
router.get('/:id', (req, res) => {
  try {
    const lobby = lobbyService.getLobby(req.params.id);
    return res.status(200).json({ lobby });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'LobbyNotFoundError',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/lobbies/:id/leave
 * Player leaves lobby
 */
router.post('/:id/leave', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const lobby = lobbyService.leaveLobby({
      lobbyId: req.params.id,
      playerId: player.id
    });

    realtimeService.broadcastToRoom(lobby.id, {
      type: 'LOBBY_STATE_CHANGED',
      lobbyId: lobby.id,
      status: lobby.status,
      playerCount: lobby.playerCount,
      maxPlayers: lobby.maxPlayers,
      isFull: lobby.isFull,
      participants: lobby.participants,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Left lobby.',
      lobby
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'LeaveLobbyError',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/lobbies/:id/start
 * EP05-03 / AC-18.3: Host starts match in a full lobby.
 */
router.post('/:id/start', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const match = lobbyService.startMatch({
      lobbyId: req.params.id,
      hostPlayerId: player.id
    });

    // Broadcast MATCH_STARTED and status 'active' to all room sockets
    realtimeService.broadcastToRoom(match.id, {
      type: 'MATCH_STARTED',
      lobbyId: match.id,
      sessionId: match.sessionId,
      status: 'active',
      game: match.game,
      participants: match.participants,
      turnPlayerId: match.hostPlayerId,
      timestamp: new Date().toISOString()
    });

    realtimeService.broadcastToRoom(match.id, {
      type: 'LOBBY_STATE_CHANGED',
      lobbyId: match.id,
      status: 'active',
      playerCount: match.playerCount,
      maxPlayers: match.maxPlayers,
      isFull: true,
      participants: match.participants,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Match started! Both players transitioned to active game session.',
      lobby: match,
      match
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'StartMatchError',
      message: err.message
    });
  }
});

/**
 * GET /api/v1/lobbies
 * List joinable lobbies
 */
router.get('/', (req, res) => {
  try {
    const db = lobbyService.db;
    const lobbies = db.prepare(
      `SELECT l.id, l.code, l.status, l.max_players, l.created_at, l.expires_at,
              g.title as game_title, g.slug as game_slug,
              p.display_name as host_name
       FROM lobbies l
       JOIN games g ON l.game_id = g.id
       JOIN players p ON l.host_player_id = p.id
       WHERE l.status IN ('waiting', 'full')
       ORDER BY l.created_at DESC
       LIMIT 50`
    ).all();

    return res.status(200).json({
      lobbies: lobbies.map(l => ({
        id: l.id,
        code: l.code,
        status: l.status,
        maxPlayers: l.max_players,
        gameTitle: l.game_title,
        gameSlug: l.game_slug,
        hostName: l.host_name,
        expiresAt: l.expires_at,
        createdAt: l.created_at
      }))
    });
  } catch (err) {
    return res.status(500).json({
      error: 'ListLobbiesError',
      message: err.message
    });
  }
});

module.exports = { lobbyRouter: router };
