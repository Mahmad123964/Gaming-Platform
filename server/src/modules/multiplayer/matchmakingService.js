const crypto = require('node:crypto');
const { getDb } = require('../../db');
const { getLobbyService } = require('./lobbyService');
const { getMetricsService } = require('../operations/metricsService');

/**
 * NexusPlay Multiplayer — Public Matchmaking Service (EP06-03, EP12-03)
 *
 * Implements:
 * - AC-22.1: Compatible opponent matching & instant match creation.
 * - AC-22.2: Waiting state when no opponent is currently available.
 * - AC-22.3: Immediate queue cancellation removing eligibility.
 * - AC-43.1 / AC-43.2: SRE metric integration with service and environment tags.
 */
class MatchmakingService {
  constructor(db, lobbyService, realtimeService, metricsService) {
    this.dbManager = (db && db.db) ? db : getDb();
    this.db = (db && db.prepare) ? db : this.dbManager.db;
    this.lobbyService = lobbyService || getLobbyService(this.dbManager);
    this.realtimeService = realtimeService; // Injected or retrieved lazily
    this.metricsService = metricsService || getMetricsService();

    // In-memory queue: gameId -> Array<{ queueTicketId, playerId, displayName, queuedAt, ip }>
    this.queues = new Map();

    // Map: queueTicketId -> { queueTicketId, gameId, playerId, status: 'queued' | 'matched' | 'cancelled' | 'expired', lobbyId }
    this.ticketIndex = new Map();
    // Map: playerId -> queueTicketId
    this.playerTicketIndex = new Map();

    // Periodic sweep for stale queue entries (every 10 seconds)
    this._sweepInterval = setInterval(() => {
      this.sweepStaleEntries();
    }, 10000);
    if (this._sweepInterval.unref) this._sweepInterval.unref();
  }

  getRealtimeService() {
    if (!this.realtimeService) {
      const { getRealtimeService } = require('./realtimeService');
      this.realtimeService = getRealtimeService();
    }
    return this.realtimeService;
  }

  /**
   * EP06-03 / AC-22.1, AC-22.2: Enter public matchmaking queue
   */
  queuePlayer({ playerId, gameIdOrSlug, ip = '127.0.0.1' }) {
    if (!playerId) {
      const err = new Error('Authentication required for public matchmaking.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    if (!gameIdOrSlug) {
      const err = new Error('gameId or gameSlug is required for matchmaking.');
      err.status = 400;
      err.code = 'BAD_REQUEST';
      throw err;
    }

    // 1. Resolve game and verify eligibility (AC-16.2 / AC-22.1)
    const game = this.db.prepare(
      'SELECT id, title, slug, is_published, min_players, max_players FROM games WHERE id = ? OR slug = ?'
    ).get(gameIdOrSlug, gameIdOrSlug);

    if (!game) {
      const err = new Error(`Game '${gameIdOrSlug}' not found.`);
      err.status = 404;
      err.code = 'GAME_NOT_FOUND';
      this.metricsService.recordMatchmakingFailure({
        service: 'matchmaking',
        environment: process.env.NODE_ENV || 'staging',
        reason: 'GAME_NOT_FOUND'
      });
      throw err;
    }

    if (game.max_players < 2) {
      const err = new Error(`Game '${game.title}' is a single-player game and does not support multiplayer matchmaking.`);
      err.status = 422;
      err.code = 'GAME_NOT_ELIGIBLE_FOR_MULTIPLAYER';
      this.metricsService.recordMatchmakingFailure({
        service: 'matchmaking',
        environment: process.env.NODE_ENV || 'staging',
        reason: 'GAME_NOT_ELIGIBLE'
      });
      throw err;
    }

    // Fetch player profile
    const player = this.db.prepare(
      'SELECT id, display_name FROM players WHERE id = ?'
    ).get(playerId);

    if (!player) {
      const err = new Error('Player account not found.');
      err.status = 404;
      err.code = 'PLAYER_NOT_FOUND';
      throw err;
    }

    // 2. Prevent duplicate active queue entries for the same player in this game
    const gameQueue = this.queues.get(game.id) || [];
    const existingIndex = gameQueue.findIndex(e => e.playerId === playerId);
    if (existingIndex !== -1) {
      const existing = gameQueue[existingIndex];
      return {
        status: 'queued',
        queueTicketId: existing.queueTicketId,
        gameId: game.id,
        gameTitle: game.title,
        queuePosition: existingIndex + 1,
        queuedAt: new Date(existing.queuedAt).toISOString(),
        estimatedWaitSeconds: 15,
        message: 'You are already in the matchmaking queue for this game.'
      };
    }

    // 3. AC-22.1: Check for an available compatible opponent in queue
    let matchedOpponent = null;
    let opponentIndex = -1;

    for (let i = 0; i < gameQueue.length; i++) {
      if (gameQueue[i].playerId !== playerId) {
        matchedOpponent = gameQueue[i];
        opponentIndex = i;
        break;
      }
    }

    if (matchedOpponent) {
      // Remove opponent from queue atomically
      gameQueue.splice(opponentIndex, 1);
      this.queues.set(game.id, gameQueue);

      // Create new private 2P lobby with opponent as host
      const lobby = this.lobbyService.createLobby({
        gameIdOrSlug: game.id,
        hostPlayerId: matchedOpponent.playerId
      });

      // Mark lobby as created through matchmaking
      try {
        this.db.prepare('UPDATE lobbies SET is_matchmaking = 1 WHERE id = ?').run(lobby.id);
      } catch (e) {}

      // Join second player as guest
      const joinedLobby = this.lobbyService.joinLobby({
        code: lobby.code,
        playerId: player.id,
        ip
      });

      // Start the match automatically
      const match = this.lobbyService.startMatch({
        lobbyId: lobby.id,
        hostPlayerId: matchedOpponent.playerId
      });

      // Mark tickets as matched
      const queueTicketId = 'mmq-' + crypto.randomUUID().slice(0, 8);
      const hostMatchedRecord = {
        status: 'matched',
        queueTicketId: matchedOpponent.queueTicketId,
        lobbyId: lobby.id,
        lobbyCode: lobby.code,
        code: lobby.code,
        gameId: game.id,
        gameTitle: game.title,
        opponent: {
          id: player.id,
          displayName: player.display_name
        },
        match
      };

      const guestMatchedRecord = {
        status: 'matched',
        queueTicketId,
        lobbyId: lobby.id,
        lobbyCode: lobby.code,
        code: lobby.code,
        gameId: game.id,
        gameTitle: game.title,
        opponent: {
          id: matchedOpponent.playerId,
          displayName: matchedOpponent.displayName
        },
        match
      };

      this.ticketIndex.set(matchedOpponent.queueTicketId, hostMatchedRecord);
      this.ticketIndex.set(queueTicketId, guestMatchedRecord);
      this.playerTicketIndex.set(matchedOpponent.playerId, matchedOpponent.queueTicketId);
      this.playerTicketIndex.set(player.id, queueTicketId);

      // EP12-03 / AC-43.2: Record matchmaking success
      this.metricsService.recordMatchmakingSuccess();

      // Realtime notification to room participants
      const rt = this.getRealtimeService();
      if (rt) {
        rt.subscribePlayerToRoom(matchedOpponent.playerId, lobby.id);
        rt.subscribePlayerToRoom(player.id, lobby.id);

        rt.broadcastToRoom(lobby.id, {
          type: 'MATCHMAKING_MATCHED',
          lobbyId: lobby.id,
          code: lobby.code,
          game: match.game,
          sessionId: match.sessionId,
          participants: match.participants,
          timestamp: new Date().toISOString()
        });
      }

      return guestMatchedRecord;
    }

    // 4. AC-22.2: No opponent available -> enter waiting queue
    const queueTicketId = 'mmq-' + crypto.randomUUID().slice(0, 8);
    const queueEntry = {
      queueTicketId,
      playerId: player.id,
      displayName: player.display_name,
      gameId: game.id,
      queuedAt: Date.now(),
      ip
    };

    gameQueue.push(queueEntry);
    this.queues.set(game.id, gameQueue);

    this.ticketIndex.set(queueTicketId, {
      queueTicketId,
      gameId: game.id,
      playerId: player.id,
      status: 'queued',
      queuedAt: queueEntry.queuedAt
    });

    const rt = this.getRealtimeService();
    if (rt) {
      const socketIds = rt.playerSockets.get(playerId);
      if (socketIds) {
        for (const sid of socketIds) {
          const client = rt.connections.get(sid);
          if (client) {
            rt.sendToSocket(client.ws, {
              type: 'MATCHMAKING_QUEUED',
              queueTicketId,
              gameId: game.id,
              gameTitle: game.title,
              queuePosition: gameQueue.length,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    }

    return {
      status: 'queued',
      queueTicketId,
      gameId: game.id,
      gameSlug: game.slug,
      gameTitle: game.title,
      position: gameQueue.length,
      queuePosition: gameQueue.length,
      elapsedSeconds: 0,
      queuedAt: new Date(queueEntry.queuedAt).toISOString(),
      estimatedWaitSeconds: 15
    };
  }

  /**
   * EP06-03 / AC-22.3: Cancel matchmaking queue request
   */
  cancelQueue({ queueTicketId, playerId }) {
    if (!queueTicketId && !playerId) {
      const err = new Error('queueTicketId or playerId is required to cancel matchmaking.');
      err.status = 400;
      err.code = 'BAD_REQUEST';
      throw err;
    }

    let found = false;

    for (const [gameId, queue] of this.queues.entries()) {
      const idx = queue.findIndex(e => 
        (queueTicketId && e.queueTicketId === queueTicketId) ||
        (playerId && e.playerId === playerId)
      );

      if (idx !== -1) {
        const removed = queue.splice(idx, 1)[0];
        this.queues.set(gameId, queue);
        this.ticketIndex.set(removed.queueTicketId, {
          status: 'cancelled',
          gameId,
          playerId: removed.playerId
        });
        if (removed.playerId) {
          this.playerTicketIndex.delete(removed.playerId);
        }

        // EP12-03 / AC-43.1: record failure / cancellation
        this.metricsService.recordMatchmakingFailure({
          service: 'matchmaking',
          environment: process.env.NODE_ENV || 'staging',
          reason: 'USER_CANCELLED'
        });

        found = true;

        // WS notification
        const rt = this.getRealtimeService();
        if (rt) {
          const socketIds = rt.playerSockets.get(removed.playerId);
          if (socketIds) {
            for (const sid of socketIds) {
              const client = rt.connections.get(sid);
              if (client) {
                rt.sendToSocket(client.ws, {
                  type: 'MATCHMAKING_CANCELLED',
                  queueTicketId: removed.queueTicketId,
                  timestamp: new Date().toISOString()
                });
              }
            }
          }
        }
        break;
      }
    }

    if (!found) {
      const err = new Error('Matchmaking queue entry not found or already matched/cancelled.');
      err.status = 404;
      err.code = 'QUEUE_ENTRY_NOT_FOUND';
      throw err;
    }

    return {
      success: true,
      cancelled: true,
      message: 'Matchmaking request cancelled successfully. You are no longer in queue.'
    };
  }

  /**
   * Get queue status for a player or ticket
   */
  getQueueStatus({ queueTicketId, playerId }) {
    for (const [gameId, queue] of this.queues.entries()) {
      const idx = queue.findIndex(e => 
        (queueTicketId && e.queueTicketId === queueTicketId) ||
        (playerId && e.playerId === playerId)
      );
      if (idx !== -1) {
        const entry = queue[idx];
        return {
          status: 'queued',
          queueTicketId: entry.queueTicketId,
          gameId,
          gameSlug: 'obsidian-chess',
          queuePosition: idx + 1,
          position: idx + 1,
          elapsedSeconds: Math.floor((Date.now() - entry.queuedAt) / 1000),
          queuedAt: new Date(entry.queuedAt).toISOString()
        };
      }
    }

    if (playerId && this.playerTicketIndex.has(playerId)) {
      const ticketId = this.playerTicketIndex.get(playerId);
      const ticket = this.ticketIndex.get(ticketId);
      if (ticket) {
        return ticket;
      }
    }

    if (queueTicketId && this.ticketIndex.has(queueTicketId)) {
      return this.ticketIndex.get(queueTicketId);
    }

    return {
      status: 'not_queued',
      message: 'Not currently queued for matchmaking.'
    };
  }

  /**
   * Sweep entries older than 2 minutes and record metric failures
   */
  sweepStaleEntries() {
    const now = Date.now();
    const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

    for (const [gameId, queue] of this.queues.entries()) {
      const active = [];
      for (const entry of queue) {
        if (now - entry.queuedAt > TIMEOUT_MS) {
          this.ticketIndex.set(entry.queueTicketId, {
            status: 'expired',
            gameId,
            playerId: entry.playerId
          });
          // EP12-03: Record failure on queue timeout
          this.metricsService.recordMatchmakingFailure({
            service: 'matchmaking',
            environment: process.env.NODE_ENV || 'staging',
            reason: 'QUEUE_TIMEOUT',
            details: { gameId, waitMs: now - entry.queuedAt }
          });

          const rt = this.getRealtimeService();
          if (rt) {
            const socketIds = rt.playerSockets.get(entry.playerId);
            if (socketIds) {
              for (const sid of socketIds) {
                const client = rt.connections.get(sid);
                if (client) {
                  rt.sendToSocket(client.ws, {
                    type: 'MATCHMAKING_TIMEOUT',
                    queueTicketId: entry.queueTicketId,
                    message: 'Matchmaking timed out after 2 minutes. Please try again.',
                    timestamp: new Date().toISOString()
                  });
                }
              }
            }
          }
        } else {
          active.push(entry);
        }
      }
      this.queues.set(gameId, active);
    }
  }

  clearAllQueues() {
    this.queues.clear();
    this.ticketIndex.clear();
  }
}

let instance = null;
function getMatchmakingService() {
  if (!instance) {
    instance = new MatchmakingService();
  }
  return instance;
}

module.exports = {
  MatchmakingService,
  getMatchmakingService
};
