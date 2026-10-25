const crypto = require('node:crypto');
const { getDb } = require('../../db');
const { getLobbyService } = require('./lobbyService');

class RealtimeSessionService {
  constructor(options = {}) {
    this.dbManager = options.dbManager || getDb();
    this.db = this.dbManager.db;
    this.lobbyService = options.lobbyService || getLobbyService(this.dbManager);

    // In-memory real-time connection state
    this.connections = new Map(); // socketId -> { ws, socketId, player, lobbyId, connectedAt, lastSeen }
    this.rooms = new Map();       // lobbyId -> Set<socketId>
    this.playerSockets = new Map(); // playerId -> Set<socketId>
    this.tickets = new Map();     // ticketId -> { ticket, playerId, audience, expiresAt, createdAt }
    this.reconnectTimers = new Map(); // "${lobbyId}:${playerId}" -> timeoutId (EP05-04)
  }

  /**
   * Helper to parse cookie string from HTTP upgrade request
   */
  parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
      let [name, ...rest] = cookie.split('=');
      name = name.trim();
      if (!name) return;
      const value = rest.join('=').trim();
      list[name] = decodeURIComponent(value);
    });
    return list;
  }

  /**
   * Generates a short-lived, single-use, audience-scoped connection ticket.
   * Enforces 60-second TTL. Does not grant general account access.
   */
  createTicket({ playerId }) {
    if (!playerId) return null;
    const ticketId = 'wst_' + crypto.randomBytes(24).toString('base64url');
    const expiresAt = Date.now() + 60 * 1000; // 60s TTL
    const ticketData = {
      ticket: ticketId,
      playerId,
      audience: 'nexusplay:websocket',
      expiresAt,
      createdAt: Date.now()
    };
    this.tickets.set(ticketId, ticketData);
    return {
      ticket: ticketId,
      expiresInSeconds: 60,
      audience: 'nexusplay:websocket'
    };
  }

  /**
   * Consumes and invalidates a single-use connection ticket.
   */
  consumeTicket(ticketId) {
    if (!ticketId || typeof ticketId !== 'string') return null;
    const ticketData = this.tickets.get(ticketId);
    if (!ticketData) return null;

    // Immediately remove (single-use enforcement)
    this.tickets.delete(ticketId);

    if (Date.now() > ticketData.expiresAt || ticketData.audience !== 'nexusplay:websocket') {
      return null;
    }

    return ticketData;
  }

  /**
   * Fetch player by ID safely
   */
  getPlayerById(playerId) {
    if (!playerId) return null;
    try {
      const row = this.db.prepare('SELECT id, email, display_name, role FROM players WHERE id = ?').get(playerId);
      if (!row) return null;
      return {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        role: row.role
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Authenticate player via session token in SQLite auth_sessions
   */
  authenticateToken(token) {
    if (!token) return null;
    try {
      const { getAuthService } = require('../identity/authService');
      const player = getAuthService().validateSession(token);
      if (!player) return null;
      return {
        id: player.id,
        email: player.email,
        displayName: player.displayName,
        role: player.role
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Handle incoming WebSocket connection from WebSocketServer
   */
  handleConnection(ws, req) {
    const socketId = 'sock-' + crypto.randomUUID().slice(0, 8);

    // 1. Primary Vector: Ambient HttpOnly session cookie
    const cookies = this.parseCookies(req.headers?.cookie);
    const sessionToken = cookies['nexusplay_session'] || cookies['nexus_session'] || cookies['auth_session'] || null;
    let player = this.authenticateToken(sessionToken);

    // 2. Secondary Vector: Short-lived, audience-scoped single-use connection ticket
    if (!player && req.url) {
      try {
        const parsedUrl = new URL(req.url, 'http://localhost');
        const ticketParam = parsedUrl.searchParams.get('ticket');
        if (ticketParam) {
          const ticketData = this.consumeTicket(ticketParam);
          if (ticketData) {
            player = this.getPlayerById(ticketData.playerId);
          }
        }
      } catch (e) {}
    }

    const clientState = {
      ws,
      socketId,
      player,
      lobbyId: null,
      connectedAt: Date.now(),
      lastSeen: Date.now()
    };

    this.connections.set(socketId, clientState);
    if (player) {
      if (!this.playerSockets.has(player.id)) {
        this.playerSockets.set(player.id, new Set());
      }
      this.playerSockets.get(player.id).add(socketId);
    }

    // Send connection established handshake
    this.sendToSocket(ws, {
      type: 'CONNECTION_ESTABLISHED',
      socketId,
      authenticated: !!player,
      player: player ? { id: player.id, displayName: player.displayName } : null,
      timestamp: new Date().toISOString()
    });

    // Listen for incoming messages
    ws.on('message', (raw) => {
      this.handleMessage(socketId, raw);
    });

    // Handle connection close
    ws.on('close', () => {
      this.handleDisconnect(socketId);
    });

    ws.on('error', (err) => {
      console.error(`[WS_ERROR] Socket ${socketId}:`, err.message);
    });
  }

  /**
   * Parse and route incoming client messages
   */
  handleMessage(socketId, raw) {
    const client = this.connections.get(socketId);
    if (!client) return;
    client.lastSeen = Date.now();

    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch (e) {
      return this.sendToSocket(client.ws, {
        type: 'ERROR',
        code: 'INVALID_JSON',
        message: 'Message payload must be valid JSON.'
      });
    }

    if (!data || !data.type) {
      return this.sendToSocket(client.ws, {
        type: 'ERROR',
        code: 'MISSING_TYPE',
        message: 'Message must include a "type" field.'
      });
    }

    switch (data.type) {
      case 'PING':
        this.sendToSocket(client.ws, { type: 'PONG', timestamp: Date.now() });
        break;

      case 'AUTH_TICKET':
        this.handleAuthTicketMessage(client, data);
        break;

      case 'AUTH':
        this.handleAuthMessage(client, data);
        break;

      case 'CREATE_LOBBY':
        this.handleCreateLobby(client, data);
        break;

      case 'JOIN_LOBBY':
        this.handleJoinLobby(client, data);
        break;

      case 'SUBSCRIBE_LOBBY':
        this.handleSubscribeLobby(client, data);
        break;

      case 'LEAVE_LOBBY':
        this.handleLeaveLobby(client, data);
        break;

      case 'START_MATCH':
        this.handleStartMatch(client, data);
        break;

      case 'GAME_MOVE':
        this.handleGameMove(client, data);
        break;

      case 'RECONNECT_MATCH':
        this.handleReconnectMatch(client, data);
        break;

      case 'MATCHMAKING_QUEUE':
        this.handleMatchmakingQueue(client, data);
        break;

      case 'MATCHMAKING_CANCEL':
        this.handleMatchmakingCancel(client, data);
        break;

      default:
        this.sendToSocket(client.ws, {
          type: 'ERROR',
          code: 'UNKNOWN_MESSAGE_TYPE',
          message: `Unknown message type: "${data.type}"`
        });
        break;
    }
  }

  /**
   * Explicit message authentication via short-lived connection ticket
   */
  handleAuthTicketMessage(client, data) {
    if (!data.ticket || typeof data.ticket !== 'string') {
      return this.sendToSocket(client.ws, {
        type: 'AUTH_FAILED',
        code: 'MISSING_TICKET',
        message: 'A short-lived single-use connection ticket is required.'
      });
    }

    const ticketData = this.consumeTicket(data.ticket);
    if (!ticketData) {
      return this.sendToSocket(client.ws, {
        type: 'AUTH_FAILED',
        code: 'INVALID_TICKET',
        message: 'Connection ticket is invalid, expired, or already consumed.'
      });
    }

    const player = this.getPlayerById(ticketData.playerId);
    if (!player) {
      return this.sendToSocket(client.ws, {
        type: 'AUTH_FAILED',
        code: 'PLAYER_NOT_FOUND',
        message: 'Player account associated with ticket was not found.'
      });
    }

    client.player = player;
    if (!this.playerSockets.has(player.id)) {
      this.playerSockets.set(player.id, new Set());
    }
    this.playerSockets.get(player.id).add(client.socketId);

    this.sendToSocket(client.ws, {
      type: 'AUTH_SUCCESS',
      player: { id: player.id, displayName: player.displayName, role: player.role },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Reject reusable raw session tokens passed in messages
   */
  handleAuthMessage(client, data) {
    return this.sendToSocket(client.ws, {
      type: 'AUTH_FAILED',
      code: 'RAW_SESSION_TOKENS_FORBIDDEN',
      message: 'Passing raw session tokens in WebSocket messages is forbidden. Use HttpOnly session cookies or request a short-lived single-use connection ticket via REST.'
    });
  }

  /**
   * EP05-01 / AC-16.1: Create two-player private lobby
   */
  handleCreateLobby(client, data) {
    if (!client.player) {
      return this.sendToSocket(client.ws, {
        type: 'LOBBY_ERROR',
        code: 'UNAUTHORIZED',
        message: 'Authentication required to create a multiplayer lobby.'
      });
    }

    try {
      const lobby = this.lobbyService.createLobby({
        gameIdOrSlug: data.gameId || data.gameSlug,
        hostPlayerId: client.player.id
      });

      // Join client socket to the room channel
      this.subscribeSocketToRoom(client, lobby.id);

      this.sendToSocket(client.ws, {
        type: 'LOBBY_CREATED',
        lobby,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      this.sendToSocket(client.ws, {
        type: 'LOBBY_ERROR',
        code: err.code || 'CREATION_FAILED',
        message: err.message,
        eligibilityDetails: err.eligibilityDetails || null
      });
    }
  }

  /**
   * EP05-02 / AC-17.1: Join lobby using invitation code
   */
  handleJoinLobby(client, data) {
    if (!client.player) {
      return this.sendToSocket(client.ws, {
        type: 'LOBBY_ERROR',
        code: 'UNAUTHORIZED',
        message: 'Authentication required to join a multiplayer lobby.'
      });
    }

    try {
      const lobby = this.lobbyService.joinLobby({
        code: data.code,
        playerId: client.player.id
      });

      // Subscribe socket to room
      this.subscribeSocketToRoom(client, lobby.id);

      // 1. Confirm join to joining player
      this.sendToSocket(client.ws, {
        type: 'LOBBY_JOINED',
        lobby,
        timestamp: new Date().toISOString()
      });

      // 2. Broadcast updated status to all participants in this room (EP05-03 / AC-18.2)
      this.broadcastToRoom(lobby.id, {
        type: 'LOBBY_STATE_CHANGED',
        lobbyId: lobby.id,
        status: lobby.status, // 'full'
        playerCount: lobby.playerCount,
        maxPlayers: lobby.maxPlayers,
        isFull: lobby.isFull,
        participants: lobby.participants,
        timestamp: new Date().toISOString()
      });

      this.broadcastToRoom(lobby.id, {
        type: 'LOBBY_MEMBER_JOINED',
        lobbyId: lobby.id,
        joinedPlayer: {
          id: client.player.id,
          displayName: client.player.displayName
        },
        participants: lobby.participants,
        timestamp: new Date().toISOString()
      }, client.socketId);

    } catch (err) {
      this.sendToSocket(client.ws, {
        type: 'LOBBY_ERROR',
        code: err.code || 'JOIN_FAILED',
        message: err.message,
        capacityDetails: err.capacityDetails || null
      });
    }
  }

  /**
   * Subscribe an authenticated socket to a lobby room
   */
  handleSubscribeLobby(client, data) {
    const lobbyId = data.lobbyId;
    if (!lobbyId) return;

    if (!client.player) {
      return this.sendToSocket(client.ws, {
        type: 'ERROR',
        code: 'UNAUTHORIZED',
        message: 'Authentication required to subscribe to lobby.'
      });
    }

    try {
      const lobby = this.lobbyService.getLobby(lobbyId);
      const isParticipant = lobby.participants.some(p => p.playerId === client.player.id);
      if (!isParticipant) {
        return this.sendToSocket(client.ws, {
          type: 'ERROR',
          code: 'FORBIDDEN',
          message: 'You are not a participant in this lobby.'
        });
      }

      this.subscribeSocketToRoom(client, lobbyId);

      this.sendToSocket(client.ws, {
        type: 'LOBBY_STATE_CHANGED',
        lobbyId: lobby.id,
        status: lobby.status,
        playerCount: lobby.playerCount,
        maxPlayers: lobby.maxPlayers,
        isFull: lobby.isFull,
        participants: lobby.participants,
        boardState: lobby.boardState,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      this.sendToSocket(client.ws, {
        type: 'ERROR',
        code: 'SUBSCRIBE_FAILED',
        message: e.message
      });
    }
  }

  /**
   * Leave lobby
   */
  handleLeaveLobby(client, data) {
    const lobbyId = data.lobbyId || client.lobbyId;
    if (!lobbyId || !client.player) return;

    try {
      const updatedLobby = this.lobbyService.leaveLobby({
        lobbyId,
        playerId: client.player.id
      });

      this.unsubscribeSocketFromRoom(client, lobbyId);

      this.sendToSocket(client.ws, {
        type: 'LOBBY_LEFT',
        lobbyId,
        timestamp: new Date().toISOString()
      });

      // Broadcast updated status to remaining room sockets
      this.broadcastToRoom(lobbyId, {
        type: 'LOBBY_STATE_CHANGED',
        lobbyId,
        status: updatedLobby.status, // e.g. 'waiting' if 1 player remains
        playerCount: updatedLobby.playerCount,
        maxPlayers: updatedLobby.maxPlayers,
        isFull: updatedLobby.isFull,
        participants: updatedLobby.participants,
        timestamp: new Date().toISOString()
      });

      this.broadcastToRoom(lobbyId, {
        type: 'LOBBY_MEMBER_LEFT',
        lobbyId,
        leftPlayer: {
          id: client.player.id,
          displayName: client.player.displayName
        },
        participants: updatedLobby.participants,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      this.sendToSocket(client.ws, {
        type: 'LOBBY_ERROR',
        code: err.code || 'LEAVE_FAILED',
        message: err.message
      });
    }
  }

  /**
   * EP05-03 / AC-18.3: Start match in a full lobby
   */
  handleStartMatch(client, data) {
    if (!client.player) {
      return this.sendToSocket(client.ws, {
        type: 'LOBBY_ERROR',
        code: 'UNAUTHORIZED',
        message: 'Authentication required to start match.'
      });
    }

    const lobbyId = data.lobbyId || client.lobbyId;
    if (!lobbyId) {
      return this.sendToSocket(client.ws, {
        type: 'LOBBY_ERROR',
        code: 'MISSING_LOBBY_ID',
        message: 'Lobby ID is required to start match.'
      });
    }

    try {
      const match = this.lobbyService.startMatch({
        lobbyId,
        hostPlayerId: client.player.id
      });

      // Broadcast MATCH_STARTED and LOBBY_STATE_CHANGED ('active') to all room sockets
      this.broadcastToRoom(lobbyId, {
        type: 'MATCH_STARTED',
        lobbyId,
        sessionId: match.sessionId,
        status: 'active',
        game: match.game,
        participants: match.participants,
        turnPlayerId: match.hostPlayerId,
        timestamp: new Date().toISOString()
      });

      this.broadcastToRoom(lobbyId, {
        type: 'LOBBY_STATE_CHANGED',
        lobbyId,
        status: 'active',
        playerCount: match.playerCount,
        maxPlayers: match.maxPlayers,
        isFull: true,
        participants: match.participants,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      this.sendToSocket(client.ws, {
        type: 'LOBBY_ERROR',
        code: err.code || 'START_MATCH_FAILED',
        message: err.message
      });
    }
  }

  /**
   * Relay synchronized in-game move (e.g. Obsidian Chess turn)
   */
  handleGameMove(client, data) {
    const lobbyId = data.lobbyId || client.lobbyId;
    if (!client.player || !lobbyId) {
      return this.sendToSocket(client.ws, {
        type: 'GAME_ERROR',
        code: 'UNAUTHORIZED',
        message: 'Must be authenticated in an active lobby to submit moves.'
      });
    }

    if (!client.lobbyId) {
      this.subscribeSocketToRoom(client, lobbyId);
    }

    // Persist synchronized board state to SQLite
    if (data.boardState || data.board) {
      this.lobbyService.updateBoardState({
        lobbyId,
        boardState: data.boardState || data.board
      });
    }

    // Broadcast move to other player in the room
    this.broadcastToRoom(lobbyId, {
      type: 'GAME_STATE_UPDATE',
      lobbyId,
      senderPlayerId: client.player.id,
      move: data.move,
      boardState: data.boardState || data.board || null,
      nextTurnPlayerId: data.nextTurnPlayerId || null,
      timestamp: new Date().toISOString()
    }, client.socketId);
  }

  /**
   * EP05-04 / AC-19.2: Reconnect to active match
   */
  handleReconnectMatch(client, data) {
    if (!client.player) {
      return this.sendToSocket(client.ws, {
        type: 'ERROR',
        code: 'UNAUTHORIZED',
        message: 'Authentication required to reconnect to a match.'
      });
    }

    const lobbyId = data.lobbyId;
    if (!lobbyId) {
      return this.sendToSocket(client.ws, {
        type: 'ERROR',
        code: 'BAD_REQUEST',
        message: 'lobbyId is required to reconnect.'
      });
    }

    try {
      const lobby = this.lobbyService.reconnectParticipant({
        lobbyId,
        playerId: client.player.id
      });

      // Clear pending forfeit timer if exists
      const timerKey = `${lobbyId}:${client.player.id}`;
      if (this.reconnectTimers.has(timerKey)) {
        clearTimeout(this.reconnectTimers.get(timerKey));
        this.reconnectTimers.delete(timerKey);
      }

      // Re-subscribe socket to room
      this.subscribeSocketToRoom(client, lobbyId);

      // AC-19.2: Broadcast PLAYER_RECONNECTED and MATCH_RESUMED to all room participants
      this.broadcastToRoom(lobbyId, {
        type: 'PLAYER_RECONNECTED',
        lobbyId,
        playerId: client.player.id,
        displayName: client.player.displayName,
        boardState: lobby.boardState,
        participants: lobby.participants,
        timestamp: new Date().toISOString()
      });

      this.broadcastToRoom(lobbyId, {
        type: 'MATCH_RESUMED',
        lobbyId,
        reconnectedPlayerId: client.player.id,
        reconnectedPlayerName: client.player.displayName,
        boardState: lobby.boardState,
        participants: lobby.participants,
        message: `${client.player.displayName} has successfully reconnected. Match resumed.`,
        timestamp: new Date().toISOString()
      });

      this.sendToSocket(client.ws, {
        type: 'RECONNECT_SUCCESS',
        lobby,
        boardState: lobby.boardState,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      // AC-19.3: Return clear unavailable message if not resumable
      this.sendToSocket(client.ws, {
        type: 'RECONNECT_FAILED',
        code: err.code || 'RECONNECT_ERROR',
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * EP06-03 / AC-22.1, AC-22.2: Enter public matchmaking queue
   */
  handleMatchmakingQueue(client, data) {
    if (!client.player) {
      return this.sendToSocket(client.ws, {
        type: 'MATCHMAKING_ERROR',
        code: 'UNAUTHORIZED',
        message: 'Authentication required to enter matchmaking queue.'
      });
    }

    try {
      const { getMatchmakingService } = require('./matchmakingService');
      const mm = getMatchmakingService();
      const result = mm.queuePlayer({
        playerId: client.player.id,
        gameIdOrSlug: data.gameId || data.gameSlug
      });

      this.sendToSocket(client.ws, {
        type: result.status === 'matched' ? 'MATCHMAKING_MATCHED' : 'MATCHMAKING_QUEUED',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      this.sendToSocket(client.ws, {
        type: 'MATCHMAKING_ERROR',
        code: err.code || 'MATCHMAKING_FAILED',
        message: err.message
      });
    }
  }

  /**
   * EP06-03 / AC-22.3: Cancel matchmaking queue
   */
  handleMatchmakingCancel(client, data) {
    if (!client.player) {
      return this.sendToSocket(client.ws, {
        type: 'MATCHMAKING_ERROR',
        code: 'UNAUTHORIZED',
        message: 'Authentication required to cancel matchmaking.'
      });
    }

    try {
      const { getMatchmakingService } = require('./matchmakingService');
      const mm = getMatchmakingService();
      const result = mm.cancelQueue({
        queueTicketId: data.queueTicketId,
        playerId: client.player.id
      });

      this.sendToSocket(client.ws, {
        type: 'MATCHMAKING_CANCELLED',
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      this.sendToSocket(client.ws, {
        type: 'MATCHMAKING_ERROR',
        code: err.code || 'CANCEL_FAILED',
        message: err.message
      });
    }
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnect(socketId) {
    const client = this.connections.get(socketId);
    if (!client) return;

    if (client.lobbyId) {
      const lobbyId = client.lobbyId;
      const playerId = client.player ? client.player.id : null;
      this.unsubscribeSocketFromRoom(client, lobbyId);

      // Check if match was active (EP05-04 / AC-19.1)
      if (playerId) {
        try {
          const lobby = this.lobbyService.getLobby(lobbyId);
          if (lobby && lobby.status === 'active') {
            const graceSeconds = 60;
            const disconnectInfo = this.lobbyService.recordDisconnect({
              lobbyId,
              playerId,
              graceSeconds
            });

            // Broadcast AC-19.1 disconnection status to the remaining opponent
            this.broadcastToRoom(lobbyId, {
              type: 'PLAYER_DISCONNECTED',
              lobbyId,
              playerId,
              disconnectedPlayerId: playerId,
              displayName: client.player ? client.player.displayName : 'Player',
              reconnectGraceSeconds: graceSeconds,
              reconnectDeadline: disconnectInfo.reconnectDeadline,
              isResumable: true,
              message: `${client.player ? client.player.displayName : 'Opponent'} temporarily disconnected. Waiting up to ${graceSeconds}s for reconnection.`,
              timestamp: new Date().toISOString()
            });

            // Start 60-second forfeit timer
            const timerKey = `${lobbyId}:${playerId}`;
            if (this.reconnectTimers.has(timerKey)) {
              clearTimeout(this.reconnectTimers.get(timerKey));
            }

            const timer = setTimeout(() => {
              try {
                this.reconnectTimers.delete(timerKey);
                const currentLobby = this.lobbyService.getLobby(lobbyId);
                if (currentLobby && currentLobby.status === 'active') {
                  const remainingPlayer = currentLobby.participants.find(p => p.playerId !== playerId);
                  this.lobbyService.forfeitMatch({
                    lobbyId,
                    forfeitedPlayerId: playerId,
                    reason: 'RECONNECT_TIMEOUT'
                  });

                  // Broadcast AC-19.3 forfeit notification
                  this.broadcastToRoom(lobbyId, {
                    type: 'MATCH_FORFEITED',
                    lobbyId,
                    reason: 'RECONNECT_TIMEOUT',
                    forfeitedPlayerId: playerId,
                    winnerPlayerId: remainingPlayer ? remainingPlayer.playerId : null,
                    message: `Match forfeited: Player did not reconnect within ${graceSeconds} seconds.`,
                    timestamp: new Date().toISOString()
                  });
                }
              } catch (e) {}
            }, graceSeconds * 1000);

            if (timer.unref) timer.unref();
            this.reconnectTimers.set(timerKey, timer);
            return;
          }
        } catch (e) {}
      }

      // If lobby was not active, simple peer disconnect
      this.broadcastToRoom(lobbyId, {
        type: 'PEER_DISCONNECTED',
        lobbyId,
        disconnectedPlayerId: playerId,
        timestamp: new Date().toISOString()
      });
    }

    if (client.player && this.playerSockets.has(client.player.id)) {
      const set = this.playerSockets.get(client.player.id);
      set.delete(socketId);
      if (set.size === 0) {
        this.playerSockets.delete(client.player.id);
      }
    }

    this.connections.delete(socketId);
  }

  /**
   * Subscribe all active sockets for a player to a room channel
   */
  subscribePlayerToRoom(playerId, lobbyId) {
    if (!playerId || !lobbyId) return;
    const socketIds = this.playerSockets.get(playerId);
    if (!socketIds || socketIds.size === 0) return;
    for (const sid of socketIds) {
      const client = this.connections.get(sid);
      if (client) {
        this.subscribeSocketToRoom(client, lobbyId);
      }
    }
  }

  /**
   * Subscribe socket to room channel
   */
  subscribeSocketToRoom(client, lobbyId) {
    if (client.lobbyId && client.lobbyId !== lobbyId) {
      this.unsubscribeSocketFromRoom(client, client.lobbyId);
    }
    client.lobbyId = lobbyId;
    if (!this.rooms.has(lobbyId)) {
      this.rooms.set(lobbyId, new Set());
    }
    this.rooms.get(lobbyId).add(client.socketId);
  }

  /**
   * Unsubscribe socket from room channel
   */
  unsubscribeSocketFromRoom(client, lobbyId) {
    client.lobbyId = null;
    if (this.rooms.has(lobbyId)) {
      const set = this.rooms.get(lobbyId);
      set.delete(client.socketId);
      if (set.size === 0) {
        this.rooms.delete(lobbyId);
      }
    }
  }

  /**
   * Broadcast message to all connected sockets in a specific room
   * Enforces strict cross-room isolation boundary
   */
  broadcastToRoom(lobbyId, message, excludeSocketId = null) {
    const socketIds = this.rooms.get(lobbyId);
    if (!socketIds || socketIds.size === 0) return;

    const payload = JSON.stringify(message);
    for (const sid of socketIds) {
      if (excludeSocketId && sid === excludeSocketId) continue;
      const client = this.connections.get(sid);
      if (client && client.ws && client.ws.readyState === 1 /* OPEN */) {
        try {
          client.ws.send(payload);
        } catch (e) {
          // ignore write errors on closing socket
        }
      }
    }
  }

  /**
   * Send JSON message to a single WebSocket client
   */
  sendToSocket(ws, message) {
    if (ws && ws.readyState === 1 /* OPEN */) {
      try {
        ws.send(JSON.stringify(message));
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Revoke active WebSocket connections when player session is revoked
   */
  handleSessionRevocation(playerId) {
    if (!playerId) return;

    // Invalidate any unconsumed tickets for this player
    for (const [tid, tdata] of this.tickets.entries()) {
      if (tdata.playerId === playerId) {
        this.tickets.delete(tid);
      }
    }

    const socketIds = this.playerSockets.get(playerId);
    if (!socketIds || socketIds.size === 0) return;

    for (const sid of socketIds) {
      const client = this.connections.get(sid);
      if (client && client.ws) {
        this.sendToSocket(client.ws, {
          type: 'SESSION_REVOKED',
          code: 'SESSION_REVOKED',
          message: 'Your active session has been terminated or revoked.'
        });
        try {
          client.ws.close(4001, 'SESSION_REVOKED');
        } catch (e) {}
      }
    }
  }

  /**
   * Get total active CCU
   */
  getConnectionCount() {
    return this.connections.size;
  }
}

let realtimeServiceInstance = null;
function getRealtimeService(options) {
  if (!realtimeServiceInstance || options) {
    realtimeServiceInstance = new RealtimeSessionService(options);
  }
  return realtimeServiceInstance;
}

module.exports = {
  RealtimeSessionService,
  getRealtimeService
};
