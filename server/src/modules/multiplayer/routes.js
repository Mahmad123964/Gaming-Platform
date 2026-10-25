const express = require('express');
const { getLobbyService } = require('./lobbyService');
const { getRealtimeService } = require('./realtimeService');
const { requireAuth, optionalAuth } = require('../identity/middleware');

const router = express.Router();
const lobbyService = getLobbyService();
const realtimeService = getRealtimeService();

/**
 * POST /api/v1/lobbies/ws-ticket
 * Issues a short-lived (60s), audience-scoped ('nexusplay:websocket'), single-use connection ticket.
 * Eliminates passing reusable raw session tokens through WebSocket URLs.
 */
router.post('/ws-ticket', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const ticketInfo = realtimeService.createTicket({ playerId: player.id });
    return res.status(200).json({
      success: true,
      ticket: ticketInfo.ticket,
      expiresInSeconds: ticketInfo.expiresInSeconds,
      audience: ticketInfo.audience,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      error: 'TicketCreationError',
      message: err.message
    });
  }
});

/**
 * POST /api/v1/lobbies
 * EP05-01 / AC-16.1: Create a two-player private lobby.
 * AC-16.2: Rejects ineligible games.
 */
router.post('/', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { gameId, gameSlug, gameIdOrSlug, maxPlayers } = req.body;

    const gameTarget = gameId || gameSlug || gameIdOrSlug;
    if (!gameTarget) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'gameId or gameSlug is required to create a lobby.'
      });
    }

    const lobby = lobbyService.createLobby({
      gameIdOrSlug: gameTarget,
      hostPlayerId: player.id,
      maxPlayers: maxPlayers ? parseInt(maxPlayers, 10) : 2
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
 * POST /api/v1/lobbies/bot
 * EP04-02 / AC-14.1: Start match against computer opponent (AI Bot) in supported game
 */
router.post('/bot', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { gameSlug = 'obsidian-chess', difficulty = 'medium' } = req.body || {};
    const { getBotService } = require('./botService');
    const botService = getBotService();
    const match = botService.createBotMatch({
      playerId: player.id,
      gameSlug,
      difficulty
    });

    realtimeService.subscribePlayerToRoom(player.id, match.id);

    return res.status(201).json({
      success: true,
      message: 'Bot match started successfully.',
      match,
      lobby: match,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'BotMatchError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/lobbies/:id/bot-move
 * EP04-02 / AC-14.2: Trigger bot response move with natural thinking latency
 */
router.post('/:id/bot-move', requireAuth, async (req, res) => {
  try {
    const player = req.player || req.user;
    const { move, difficulty, delayMs } = req.body || {};
    const { getBotService } = require('./botService');
    const botService = getBotService();
    const result = await botService.processBotTurn({
      lobbyId: req.params.id,
      playerMove: move,
      humanPlayerId: player.id,
      difficulty,
      delayMs
    });

    return res.status(200).json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'BotTurnError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/lobbies/:id/bot-end
 * EP04-02 / AC-14.3: End bot match and record outcome
 */
router.post('/:id/bot-end', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { outcome = 'victory', score = 100 } = req.body || {};
    const { getBotService } = require('./botService');
    const botService = getBotService();
    const result = botService.endBotMatch({
      lobbyId: req.params.id,
      humanPlayerId: player.id,
      outcome,
      score
    });

    return res.status(200).json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'BotEndError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/lobbies/join
 * EP05-02 / AC-17.1: Join lobby with invitation code.
 * AC-17.2: Rejects invalid or expired code.
 * AC-17.3 / AC-16.3: Rejects full lobby.
 * Enforces rate limiting on failed attempts.
 */
router.post('/join', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { code } = req.body;
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || req.ip || req.socket?.remoteAddress || '127.0.0.1';

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'A valid invitation code is required.'
      });
    }

    const lobby = lobbyService.joinLobby({
      code: code.trim(),
      playerId: player.id,
      ip
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
    if (status === 429 && err.retryAfterSeconds) {
      res.setHeader('Retry-After', err.retryAfterSeconds);
    }
    return res.status(status).json({
      error: err.code || 'JoinLobbyError',
      message: err.message,
      capacityDetails: err.capacityDetails || null,
      retryAfter: err.retryAfterSeconds || null,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/lobbies/code/:code
 * Lookup lobby by invitation code (case-insensitive).
 * Enforces rate limiting on failed lookups and redacts participant PII before authorization.
 */
router.get('/code/:code', optionalAuth, (req, res) => {
  try {
    const code = req.params.code;
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || req.ip || req.socket?.remoteAddress || '127.0.0.1';
    const player = req.player || req.user || null;

    const lobby = lobbyService.getLobbyByCode(code, {
      ip,
      playerId: player ? player.id : null,
      previewOnly: true
    });

    if (!lobby) {
      return res.status(404).json({
        error: 'INVALID_INVITATION_CODE',
        message: `No active lobby found for invitation code '${code}'.`
      });
    }

    return res.status(200).json({ lobby });
  } catch (err) {
    const status = err.status || 500;
    if (status === 429 && err.retryAfterSeconds) {
      res.setHeader('Retry-After', err.retryAfterSeconds);
    }
    return res.status(status).json({
      error: err.code || 'LookupError',
      message: err.message,
      retryAfter: err.retryAfterSeconds || null
    });
  }
});

/**
 * GET /api/v1/lobbies/:id
 * EP05-03: View lobby status (waiting, full, active)
 * AC-18.1: waiting
 * AC-18.2: full
 * AC-18.3: active
 * Redacts participant details if caller is not an authorized member.
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const player = req.player || req.user || null;
    const lobby = lobbyService.getLobby(req.params.id);

    // If caller is not the host and not an active participant, return preview
    const isMember = player && (
      lobby.hostPlayerId === player.id ||
      lobby.participants.some(p => p.playerId === player.id)
    );

    if (!isMember) {
      const preview = lobbyService.getLobbyPreview(req.params.id);
      return res.status(200).json({ lobby: preview });
    }

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
 * POST /api/v1/lobbies/:id/reconnect
 * EP05-04 / AC-19.2: Reconnect to active match within grace period
 * AC-19.3: Clear unavailable message if no longer resumable (HTTP 410)
 */
router.post('/:id/reconnect', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const lobby = lobbyService.reconnectParticipant({
      lobbyId: req.params.id,
      playerId: player.id
    });

    // Clear forfeit timer in realtimeService
    const timerKey = `${lobby.id}:${player.id}`;
    if (realtimeService.reconnectTimers && realtimeService.reconnectTimers.has(timerKey)) {
      clearTimeout(realtimeService.reconnectTimers.get(timerKey));
      realtimeService.reconnectTimers.delete(timerKey);
    }

    realtimeService.subscribePlayerToRoom(player.id, lobby.id);

    // Broadcast AC-19.2 PLAYER_RECONNECTED and MATCH_RESUMED to room
    realtimeService.broadcastToRoom(lobby.id, {
      type: 'PLAYER_RECONNECTED',
      lobbyId: lobby.id,
      playerId: player.id,
      displayName: player.displayName,
      boardState: lobby.boardState,
      participants: lobby.participants,
      timestamp: new Date().toISOString()
    });

    realtimeService.broadcastToRoom(lobby.id, {
      type: 'MATCH_RESUMED',
      lobbyId: lobby.id,
      reconnectedPlayerId: player.id,
      reconnectedPlayerName: player.displayName,
      boardState: lobby.boardState,
      participants: lobby.participants,
      message: `${player.displayName} has successfully reconnected. Match resumed.`,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Successfully reconnected to match.',
      lobby,
      boardState: lobby.boardState
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'ReconnectError',
      message: err.message,
      timestamp: new Date().toISOString()
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

// ==============================================================================
// PUBLIC MATCHMAKING ROUTER (EP06-03)
// ==============================================================================
const matchmakingRouter = express.Router();
const { getMatchmakingService } = require('./matchmakingService');

/**
 * POST /api/v1/matchmaking/queue
 * EP06-03 / AC-22.1: Join matchmaking; match formed if opponent available
 * AC-22.2: Returns waiting state if no opponent
 */
matchmakingRouter.post('/queue', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { gameId, gameSlug, gameIdOrSlug } = req.body || {};
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || req.ip || req.socket?.remoteAddress || '127.0.0.1';

    const gameTarget = gameId || gameSlug || gameIdOrSlug;
    const mm = getMatchmakingService();
    const result = mm.queuePlayer({
      playerId: player.id,
      gameIdOrSlug: gameTarget,
      ip
    });

    return res.status(200).json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'MatchmakingError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/v1/matchmaking/queue
 * EP06-03 / AC-22.3: Cancel matchmaking queue request
 */
matchmakingRouter.delete('/queue', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { queueTicketId } = req.body || {};
    const mm = getMatchmakingService();
    const result = mm.cancelQueue({
      queueTicketId,
      playerId: player.id
    });

    return res.status(200).json({
      success: true,
      cancelled: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'CancelMatchmakingError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

matchmakingRouter.post('/cancel', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const { queueTicketId } = req.body || {};
    const mm = getMatchmakingService();
    const result = mm.cancelQueue({
      queueTicketId,
      playerId: player.id
    });

    return res.status(200).json({
      success: true,
      cancelled: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.code || 'CancelMatchmakingError',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/v1/matchmaking/status
 * Check current matchmaking queue status for player
 */
matchmakingRouter.get('/status', requireAuth, (req, res) => {
  try {
    const player = req.player || req.user;
    const mm = getMatchmakingService();
    const status = mm.getQueueStatus({ playerId: player.id });
    return res.status(200).json({
      success: true,
      ...status,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      error: 'MatchmakingStatusError',
      message: err.message
    });
  }
});

module.exports = {
  lobbyRouter: router,
  matchmakingRouter
};
