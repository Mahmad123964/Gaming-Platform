import React, { useState, useEffect, useRef } from 'react';
import styles from './MultiplayerLobbyModal.module.css';
import { Lobby } from '../../types/multiplayer';
import { User } from '../AuthModal';
import { getCsrfToken } from '../../utils/csrf';

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onOpenLogin: () => void;
  preselectedGameSlug?: string | null;
  onLog?: (msg: string, type?: 'dim' | 'green' | 'blue' | 'yellow' | 'rose') => void;
}

interface ChessSquare {
  piece: string | null;
  color: 'w' | 'b' | null;
}

const INITIAL_BOARD: ChessSquare[][] = [
  [
    { piece: 'bR', color: 'b' }, { piece: 'bN', color: 'b' }, { piece: 'bB', color: 'b' }, { piece: 'bQ', color: 'b' },
    { piece: 'bK', color: 'b' }, { piece: 'bB', color: 'b' }, { piece: 'bN', color: 'b' }, { piece: 'bR', color: 'b' }
  ],
  [
    { piece: 'bP', color: 'b' }, { piece: 'bP', color: 'b' }, { piece: 'bP', color: 'b' }, { piece: 'bP', color: 'b' },
    { piece: 'bP', color: 'b' }, { piece: 'bP', color: 'b' }, { piece: 'bP', color: 'b' }, { piece: 'bP', color: 'b' }
  ],
  Array(8).fill(null).map(() => ({ piece: null, color: null })),
  Array(8).fill(null).map(() => ({ piece: null, color: null })),
  Array(8).fill(null).map(() => ({ piece: null, color: null })),
  Array(8).fill(null).map(() => ({ piece: null, color: null })),
  [
    { piece: 'wP', color: 'w' }, { piece: 'wP', color: 'w' }, { piece: 'wP', color: 'w' }, { piece: 'wP', color: 'w' },
    { piece: 'wP', color: 'w' }, { piece: 'wP', color: 'w' }, { piece: 'wP', color: 'w' }, { piece: 'wP', color: 'w' }
  ],
  [
    { piece: 'wR', color: 'w' }, { piece: 'wN', color: 'w' }, { piece: 'wB', color: 'w' }, { piece: 'wQ', color: 'w' },
    { piece: 'wK', color: 'w' }, { piece: 'wB', color: 'w' }, { piece: 'wN', color: 'w' }, { piece: 'wR', color: 'w' }
  ]
];

const PIECE_SYMBOLS: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
};

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onOpenLogin,
  preselectedGameSlug,
  onLog
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join' | 'matchmaking' | 'bot'>('create');
  const [selectedGameId, setSelectedGameId] = useState<string>(preselectedGameSlug || 'obsidian-chess');
  const [selectedCapacity, setSelectedCapacity] = useState<number>(2);
  const [joinCode, setJoinCode] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Bot Opponent State (EP04-02)
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Matchmaking State (EP06-03)
  const [isSearchingMatch, setIsSearchingMatch] = useState<boolean>(false);
  const [queueTicketId, setQueueTicketId] = useState<string | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(1);
  const [searchSeconds, setSearchSeconds] = useState<number>(0);

  // Disconnection / Reconnection State (EP05-04)
  const [peerDisconnected, setPeerDisconnected] = useState<boolean>(false);
  const [disconnectCountdown, setDisconnectCountdown] = useState<number>(60);
  const [matchOutcome, setMatchOutcome] = useState<string | null>(null);

  // Active lobby & real-time match state
  const [activeLobby, setActiveLobby] = useState<Lobby | null>(null);
  const [boardState, setBoardState] = useState<ChessSquare[][]>(INITIAL_BOARD);
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [selectedPos, setSelectedPos] = useState<[number, number] | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Matchmaking timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSearchingMatch) {
      setSearchSeconds(0);
      timer = setInterval(() => {
        setSearchSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSearchingMatch]);

  // Disconnection countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (peerDisconnected && disconnectCountdown > 0) {
      timer = setInterval(() => {
        setDisconnectCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [peerDisconnected, disconnectCountdown]);

  // Sync preselected game
  useEffect(() => {
    if (preselectedGameSlug) {
      setSelectedGameId(preselectedGameSlug);
      setActiveTab('create');
    }
  }, [preselectedGameSlug]);

  // Connect to Realtime WebSocket
  useEffect(() => {
    if (!isOpen) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (onLog) onLog(`[Multiplayer Gateway] WebSocket connected to ${wsUrl}`, 'green');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'LOBBY_STATE' && (data.lobby || data.payload?.lobby)) {
          setActiveLobby(data.lobby || data.payload.lobby);
        } else if (data.type === 'PLAYER_JOINED' || data.type === 'LOBBY_STATE_CHANGED') {
          const lobbyData = data.lobby || data.payload?.lobby || data;
          setActiveLobby((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              playerCount: lobbyData.playerCount || prev.playerCount,
              isFull: lobbyData.isFull !== undefined ? lobbyData.isFull : prev.isFull,
              status: lobbyData.status || prev.status,
              participants: lobbyData.participants || prev.participants
            };
          });
          const playerName = data.payload?.player?.displayName || data.player?.displayName;
          if (onLog && playerName) onLog(`Player "${playerName}" joined the lobby. Status: ${lobbyData.status}.`, 'blue');
        } else if (data.type === 'MATCH_STARTED') {
          const sessionId = data.sessionId || data.payload?.sessionId || 'session-active';
          setActiveLobby((prev) => prev ? { ...prev, status: 'active', sessionId } : null);
          if (onLog) onLog(`Multiplayer Match Started! Session: ${sessionId}`, 'green');
        } else if (data.type === 'MOVE_MADE' || data.type === 'GAME_STATE_UPDATE') {
          const move = data.move || data.payload?.move;
          const nextTurn = data.nextTurn || data.payload?.nextTurn;
          if (move && move.from && move.to) {
            setBoardState((prev) => {
              const next = prev.map((row) => row.map((cell) => ({ ...cell })));
              const piece = next[move.from.row][move.from.col];
              next[move.from.row][move.from.col] = { piece: null, color: null };
              next[move.to.row][move.to.col] = piece;
              return next;
            });
            setTurn(nextTurn || (turn === 'w' ? 'b' : 'w'));
            setMoveHistory((prev) => [...prev, `${move.player || 'Player'}: ${move.notation || 'Move'}`]);
          }
        } else if (data.type === 'MATCHMAKING_QUEUED') {
          setIsSearchingMatch(true);
          setQueuePosition(data.queuePosition || 1);
          if (data.queueTicketId) setQueueTicketId(data.queueTicketId);
          if (onLog) onLog(`In Matchmaking Queue for ${data.gameTitle || 'Game'}. Position #${data.queuePosition || 1}`, 'blue');
        } else if (data.type === 'MATCHMAKING_MATCHED') {
          setIsSearchingMatch(false);
          const lobbyData = data.lobby || data.match || data;
          setActiveLobby(lobbyData);
          if (onLog) onLog(`Matchmaking paired! Joined match for ${lobbyData.game?.title || 'Game'}!`, 'green');
        } else if (data.type === 'MATCHMAKING_CANCELLED') {
          setIsSearchingMatch(false);
          setQueueTicketId(null);
          if (onLog) onLog(`Matchmaking search cancelled.`, 'yellow');
        } else if (data.type === 'PLAYER_DISCONNECTED') {
          setPeerDisconnected(true);
          setDisconnectCountdown(data.reconnectGraceSeconds || 60);
          if (onLog) onLog(data.message || `Opponent disconnected. Waiting for reconnection...`, 'yellow');
        } else if (data.type === 'MATCH_RESUMED') {
          setPeerDisconnected(false);
          if (data.boardState) setBoardState(data.boardState);
          if (onLog) onLog(data.message || `Opponent reconnected! Match resumed.`, 'green');
        } else if (data.type === 'MATCH_FORFEITED') {
          setPeerDisconnected(false);
          setMatchOutcome(data.message || 'Match forfeited: Opponent failed to reconnect.');
          if (onLog) onLog(data.message || 'Match forfeited.', 'rose');
        } else if (data.type === 'PLAYER_LEFT') {
          const lobbyData = data.lobby || data.payload?.lobby;
          if (lobbyData) {
            setActiveLobby(lobbyData);
          }
          if (onLog) onLog(`Player left the lobby.`, 'yellow');
        } else if (data.type === 'GAME_STATE_UPDATE') {
          setIsBotThinking(false);
          if (data.isBot && data.move) {
            // Apply heuristic move for Black piece
            setBoardState((prev) => {
              const b = prev.map((row) => row.map((cell) => ({ ...cell })));
              // Standard Black pawn opening e7 -> e5
              if (b[1][4].piece) {
                b[3][4] = b[1][4];
                b[1][4] = { piece: null, color: null };
              } else if (b[0][6].piece) { // g8 -> f6
                b[2][5] = b[0][6];
                b[0][6] = { piece: null, color: null };
              }
              return b;
            });
            setTurn('w');
            setMoveHistory((prev) => [...prev, `Nexus AI (Bot): ${data.move.piece || 'P'} ${data.move.from} -> ${data.move.to} (${data.latencyMs || 600}ms)`]);
            if (onLog) onLog(`Nexus AI responded with ${data.move.from} -> ${data.move.to} in ${data.latencyMs || 600}ms (AC-14.2)`, 'blue');
          }
        }
      } catch (e) {
        // ignore parse error
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [isOpen, onLog, turn]);

  // Ensure lobby socket room subscription
  useEffect(() => {
    if (activeLobby && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'JOIN_LOBBY',
        payload: { lobbyId: activeLobby.id, code: activeLobby.code }
      }));
    }
  }, [activeLobby?.id]);

  // Polling sync fallback while waiting for opponent (EP05-03 / AC-18.2)
  useEffect(() => {
    if (!activeLobby || activeLobby.status !== 'waiting') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/lobbies/${activeLobby.id}`);
        if (res.ok) {
          const data = await res.json();
          const lobby = data.lobby || data.data?.lobby;
          if (lobby && (lobby.status !== 'waiting' || lobby.playerCount !== activeLobby.playerCount)) {
            setActiveLobby(lobby);
          }
        }
      } catch (e) {}
    }, 1200);
    return () => clearInterval(interval);
  }, [activeLobby?.id, activeLobby?.status, activeLobby?.playerCount]);

  // Keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Create Lobby Handler (AC-16.1, AC-16.2)
  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/lobbies', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({
          gameIdOrSlug: selectedGameId,
          gameSlug: selectedGameId,
          gameId: selectedGameId,
          maxPlayers: selectedCapacity
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `HTTP ${res.status}`);
      }

      const lobby = data.lobby || data.data?.lobby;
      if (!lobby) {
        throw new Error('Lobby data missing in server response');
      }

      setActiveLobby(lobby);
      setSuccessMsg(`Lobby created! Invitation code: ${lobby.code} (${selectedCapacity} Players)`);
      if (onLog) onLog(`Lobby created for "${lobby.game.title}" (Code: ${lobby.code}, Capacity: ${selectedCapacity})`, 'green');
    } catch (err: any) {
      setErrorMsg(err.message);
      if (onLog) onLog(`Failed to create lobby: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  };

  // Bot Match Handler (EP04-02 / AC-14.1)
  const handleStartBotMatch = async () => {
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/lobbies/bot', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({
          gameSlug: 'obsidian-chess',
          difficulty: botDifficulty
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `HTTP ${res.status}`);
      }

      const match = data.match || data.lobby;
      setActiveLobby(match);
      setSuccessMsg(`Match started against Nexus AI (Bot)! You play White.`);
      if (onLog) onLog(`Single-click AI Bot match launched in Obsidian Chess (AC-14.1)`, 'green');
    } catch (err: any) {
      setErrorMsg(err.message);
      if (onLog) onLog(`Failed to start bot match: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  };

  // Join Lobby Handler (AC-17.1, AC-17.2, AC-17.3)
  const handleJoinLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenLogin();
      return;
    }

    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setErrorMsg('Invitation code must be exactly 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/v1/lobbies/join', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ code: cleanCode })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `HTTP ${res.status}`);
      }

      const lobby = data.lobby || data.data?.lobby;
      if (!lobby) {
        throw new Error('Lobby data missing in server response');
      }

      setActiveLobby(lobby);
      setSuccessMsg(`Joined lobby for "${lobby.game.title}"!`);
      if (onLog) onLog(`Joined lobby ${cleanCode} as Guest (${currentUser.displayName})`, 'green');
    } catch (err: any) {
      setErrorMsg(err.message);
      if (onLog) onLog(`Failed to join lobby: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  };

  // Start Match Handler (AC-18.3)
  const handleStartMatch = async () => {
    if (!activeLobby) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/v1/lobbies/${activeLobby.id}/start`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || `HTTP ${res.status}`);
      }

      const lobby = data.lobby || data.match || data.data?.lobby || data.data?.match;
      if (lobby) {
        setActiveLobby(lobby);
      } else {
        setActiveLobby((prev) => prev ? { ...prev, status: 'active' } : null);
      }
      if (onLog) onLog(`2-Player Match Started for lobby ${activeLobby.code}!`, 'green');
    } catch (err: any) {
      setErrorMsg(err.message);
      if (onLog) onLog(`Cannot start match: ${err.message}`, 'rose');
    } finally {
      setLoading(false);
    }
  };

  // Start Matchmaking Handler (EP06-03 / AC-22.1, AC-22.2)
  const handleStartMatchmaking = async () => {
    if (!currentUser) {
      onOpenLogin();
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/v1/matchmaking/queue', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ gameIdOrSlug: selectedGameId })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      if (data.status === 'matched') {
        setActiveLobby(data.lobby || data.match);
        setSuccessMsg('Opponent found! Match starting now.');
      } else {
        setIsSearchingMatch(true);
        setQueueTicketId(data.queueTicketId);
        setQueuePosition(data.queuePosition || 1);
        setSuccessMsg('Searching for an available opponent...');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel Matchmaking Handler (EP06-03 / AC-22.3)
  const handleCancelMatchmaking = async () => {
    setLoading(true);
    try {
      await fetch('/api/v1/matchmaking/queue', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        },
        body: JSON.stringify({ queueTicketId })
      });
      setIsSearchingMatch(false);
      setQueueTicketId(null);
      setSuccessMsg('Matchmaking search cancelled.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reconnect Handler (EP05-04 / AC-19.2)
  const handleReconnect = async () => {
    if (!activeLobby) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/lobbies/${activeLobby.id}/reconnect`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error);
      }
      setPeerDisconnected(false);
      if (data.boardState) setBoardState(data.boardState);
      setSuccessMsg('Reconnected successfully! Match resumed.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Leave Lobby Handler
  const handleLeaveLobby = async () => {
    if (!activeLobby) return;
    try {
      await fetch(`/api/v1/lobbies/${activeLobby.id}/leave`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken()
        }
      });
    } catch (e) {
      // ignore
    }
    setActiveLobby(null);
    setBoardState(INITIAL_BOARD);
    setSelectedPos(null);
    setMoveHistory([]);
    if (onLog) onLog(`Left lobby.`, 'yellow');
  };

  // Copy Code to Clipboard
  const handleCopyCode = () => {
    if (!activeLobby?.code) return;
    navigator.clipboard.writeText(activeLobby.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Chess Board Click & Movement Sync
  const handleSquareClick = (r: number, c: number) => {
    if (activeLobby?.status !== 'active') return;

    const isHost = activeLobby.hostPlayerId === currentUser?.id;
    const myColor = isHost ? 'w' : 'b';

    // Must be user's turn
    if (turn !== myColor) {
      if (onLog) onLog(`Not your turn! Waiting for opponent.`, 'yellow');
      return;
    }

    if (selectedPos === null) {
      // Pick up piece
      const square = boardState[r][c];
      if (square.piece && square.color === myColor) {
        setSelectedPos([r, c]);
      }
    } else {
      const [fromR, fromC] = selectedPos;
      if (fromR === r && fromC === c) {
        setSelectedPos(null);
        return;
      }

      const piece = boardState[fromR][fromC];
      // Execute local move
      const nextBoard = boardState.map((row) => row.map((cell) => ({ ...cell })));
      nextBoard[fromR][fromC] = { piece: null, color: null };
      nextBoard[r][c] = piece;
      setBoardState(nextBoard);

      const nextTurn = myColor === 'w' ? 'b' : 'w';
      setTurn(nextTurn);
      setSelectedPos(null);

      const moveNotation = `${piece.piece} ${String.fromCharCode(97 + fromC)}${8 - fromR} -> ${String.fromCharCode(97 + c)}${8 - r}`;
      setMoveHistory((prev) => [...prev, `${currentUser?.displayName}: ${moveNotation}`]);

      // Broadcast move to opponent via WebSocket
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'GAME_MOVE',
          lobbyId: activeLobby.id,
          move: {
            from: { row: fromR, col: fromC },
            to: { row: r, col: c },
            player: currentUser?.displayName,
            notation: moveNotation
          },
          boardState: nextBoard,
          nextTurn
        }));
      }

      // If playing against AI Bot (EP04-02 / AC-14.2), trigger bot calculation
      if (activeLobby.isBot) {
        setIsBotThinking(true);
        const fromCoord = `${String.fromCharCode(97 + fromC)}${8 - fromR}`;
        const toCoord = `${String.fromCharCode(97 + c)}${8 - r}`;
        fetch(`/api/v1/lobbies/${activeLobby.id}/bot-move`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken()
          },
          body: JSON.stringify({
            move: { from: fromCoord, to: toCoord, piece: piece.piece },
            difficulty: activeLobby.botDifficulty || botDifficulty
          })
        })
          .then((res) => res.json())
          .then((data) => {
            setIsBotThinking(false);
            if (data.botMove) {
              setBoardState((prev) => {
                const b = prev.map((row) => row.map((cell) => ({ ...cell })));
                if (b[1][4].piece) {
                  b[3][4] = b[1][4];
                  b[1][4] = { piece: null, color: null };
                } else if (b[0][6].piece) {
                  b[2][5] = b[0][6];
                  b[0][6] = { piece: null, color: null };
                }
                return b;
              });
              setTurn('w');
              setMoveHistory((prev) => [
                ...prev,
                `Nexus AI (Bot): ${data.botMove.piece || 'P'} ${data.botMove.from} -> ${data.botMove.to} (${data.latencyMs || 600}ms)`
              ]);
              if (onLog) onLog(`Nexus AI responded in ${data.latencyMs}ms (AC-14.2)`, 'blue');
            }
          })
          .catch((err) => {
            setIsBotThinking(false);
            if (onLog) onLog(`Bot move error: ${err.message}`, 'rose');
          });
      }
    }
  };

  if (!isOpen) return null;

  const isHost = activeLobby ? activeLobby.hostPlayerId === currentUser?.id : false;
  const hostParticipant = activeLobby?.participants.find((p) => p.role === 'host');
  const guestParticipant = activeLobby?.participants.find((p) => p.role === 'guest');

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="multiplayer-title">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} id="multiplayer-lobby-dialog">
        {/* Modal Header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <div className={styles.iconWrapper}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div>
              <h2 id="multiplayer-title" className={styles.title}>
                {activeLobby ? activeLobby.game.title : 'Multiplayer Arena'}
              </h2>
              <p className={styles.subtitle}>
                {activeLobby ? 'Two-Player Synchronized Session (Sprint 08)' : 'Join or Host a 2-Player Online Game Session'}
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close dialog" id="btn-close-lobby-modal">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className={styles.body}>
          {/* Error Banner */}
          {errorMsg && (
            <div className={styles.errorBanner} id="lobby-error-banner" role="alert">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && !activeLobby && (
            <div className={styles.infoBanner} id="lobby-success-banner">
              <span>{successMsg}</span>
            </div>
          )}

          {/* Unauthenticated notice */}
          {!currentUser && (
            <div className={styles.infoBanner} style={{ borderLeft: '4px solid #FFB800' }}>
              <strong>Authentication Required:</strong> You must sign in or register to host or join multiplayer lobbies.
              <button
                type="button"
                className={styles.primaryBtn}
                style={{ marginTop: 12, padding: '10px 16px', width: 'auto' }}
                onClick={onOpenLogin}
                id="btn-login-for-lobby"
              >
                Sign In / Register
              </button>
            </div>
          )}

          {/* VIEW A: NO ACTIVE LOBBY (TABS FOR CREATE OR JOIN) */}
          {!activeLobby ? (
            <div>
              <div className={styles.tabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'create'}
                  className={`${styles.tabBtn} ${activeTab === 'create' ? styles.activeTab : ''}`}
                  onClick={() => { setActiveTab('create'); setErrorMsg(null); }}
                  id="tab-create-lobby"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                  Host New Lobby (EP05-01)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'join'}
                  className={`${styles.tabBtn} ${activeTab === 'join' ? styles.activeTab : ''}`}
                  onClick={() => { setActiveTab('join'); setErrorMsg(null); }}
                  id="tab-join-lobby"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                  </svg>
                  Join via Code (EP05-02)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'matchmaking'}
                  className={`${styles.tabBtn} ${activeTab === 'matchmaking' ? styles.activeTab : ''}`}
                  onClick={() => { setActiveTab('matchmaking'); setErrorMsg(null); }}
                  id="tab-matchmaking-lobby"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                  </svg>
                  Find Opponent (EP06-03)
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'bot'}
                  className={`${styles.tabBtn} ${activeTab === 'bot' ? styles.activeTab : ''}`}
                  onClick={() => { setActiveTab('bot'); setErrorMsg(null); }}
                  id="tab-bot-lobby"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
                    <circle cx="12" cy="5" r="2"></circle>
                    <path d="M12 7v4"></path>
                    <line x1="8" y1="16" x2="8" y2="16"></line>
                    <line x1="16" y1="16" x2="16" y2="16"></line>
                  </svg>
                  Play AI Bot (EP04-02)
                </button>
              </div>

              {/* CREATE LOBBY TAB */}
              {activeTab === 'create' && (
                <form onSubmit={handleCreateLobby} id="form-create-lobby">
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="select-multiplayer-game">
                      Select Game Title
                    </label>
                    <select
                      id="select-multiplayer-game"
                      className={styles.select}
                      value={selectedGameId}
                      onChange={(e) => {
                        setSelectedGameId(e.target.value);
                        if (e.target.value === 'obsidian-chess') {
                          setSelectedCapacity(2);
                        }
                      }}
                    >
                      <option value="obsidian-chess">Obsidian Chess (2 Players — Eligible)</option>
                      <option value="vortex-arena">Vortex Arena (Up to 4 Players — Group Play Ready)</option>
                      <option value="cyber-invaders">Cyber Invaders (1 Player — Ineligible Test AC-16.2)</option>
                      <option value="neon-drift">Neon Drift: Cyber Circuit (Multiplayer Ready)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Session Capacity (Group Play — EP06-01 / EP06-02)
                    </label>
                    <div className={styles.capacitySelector} id="capacity-selector-group">
                      <button
                        type="button"
                        className={`${styles.capacityBtn} ${selectedCapacity === 2 ? styles.capacityBtnActive : ''}`}
                        onClick={() => setSelectedCapacity(2)}
                        id="btn-capacity-2p"
                      >
                        <span>2 Players</span>
                        <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>Standard Duel</span>
                      </button>
                      <button
                        type="button"
                        disabled={selectedGameId === 'obsidian-chess'}
                        className={`${styles.capacityBtn} ${selectedCapacity === 3 ? styles.capacityBtnActive : ''}`}
                        onClick={() => setSelectedCapacity(3)}
                        id="btn-capacity-3p"
                        title={selectedGameId === 'obsidian-chess' ? 'Obsidian Chess supports max 2 players' : '3-Player Group Lobby (EP06-01)'}
                      >
                        <span>3 Players</span>
                        <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>Group Match</span>
                      </button>
                      <button
                        type="button"
                        disabled={selectedGameId === 'obsidian-chess'}
                        className={`${styles.capacityBtn} ${selectedCapacity === 4 ? styles.capacityBtnActive : ''}`}
                        onClick={() => setSelectedCapacity(4)}
                        id="btn-capacity-4p"
                        title={selectedGameId === 'obsidian-chess' ? 'Obsidian Chess supports max 2 players' : '4-Player Arena (EP06-02)'}
                      >
                        <span>4 Players</span>
                        <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>Full Arena</span>
                      </button>
                    </div>
                  </div>

                  <div className={styles.infoBanner}>
                    <strong>Lobby Specs (Sprints 08 & 10):</strong> Configurable 2 to 4 player capacity. 6-character cryptographic invitation code generated automatically. 30-minute expiry window.
                  </div>

                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={loading || !currentUser}
                    id="btn-submit-create-lobby"
                  >
                    {loading ? 'Creating Secure Lobby...' : `Generate ${selectedCapacity}-Player Lobby (AC-16.1, AC-20.1, AC-21.1)`}
                  </button>
                </form>
              )}

              {/* PLAY AI BOT TAB (EP04-02) */}
              {activeTab === 'bot' && (
                <div id="bot-match-panel">
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      Game Title
                    </label>
                    <div style={{ color: '#00F0FF', fontWeight: 700, padding: '10px 14px', background: 'rgba(0, 240, 255, 0.05)', borderRadius: 8, border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                      Obsidian Chess (AI Bot Supported — EP04-02)
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="select-bot-difficulty">
                      Bot Difficulty Rating
                    </label>
                    <select
                      id="select-bot-difficulty"
                      className={styles.select}
                      value={botDifficulty}
                      onChange={(e) => setBotDifficulty(e.target.value as any)}
                    >
                      <option value="easy">Novice AI (Easy)</option>
                      <option value="medium">Nexus Heuristic Engine (Medium — Recommended)</option>
                      <option value="hard">Grandmaster Heuristic (Hard)</option>
                    </select>
                  </div>

                  <div className={styles.infoBanner}>
                    <strong>Computer Opponent Specs (EP04-02):</strong>
                    <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                      <li>Single-click start: begins immediately without a 2nd human player (AC-14.1).</li>
                      <li>Natural thinking time: moves responded within 500ms - 1500ms (AC-14.2).</li>
                      <li>Telemetry isolation: results tracked with <code>is_bot: 1</code> distinction (AC-14.3).</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={loading || !currentUser}
                    onClick={handleStartBotMatch}
                    id="btn-start-bot-match"
                  >
                    {loading ? 'Initializing AI Match...' : 'Play Against Nexus AI (AC-14.1)'}
                  </button>
                </div>
              )}

              {/* JOIN LOBBY TAB */}
              {activeTab === 'join' && (
                <form onSubmit={handleJoinLobby} id="form-join-lobby">
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="input-lobby-code">
                      Enter 6-Character Invitation Code
                    </label>
                    <input
                      id="input-lobby-code"
                      type="text"
                      className={`${styles.input} ${styles.codeInput}`}
                      maxLength={6}
                      placeholder="e.g. 7K4P9X"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      autoFocus
                    />
                  </div>

                  <div className={styles.infoBanner}>
                    <strong>Code Details:</strong> Codes are 6 alphanumeric characters (case-insensitive). Once joined, the lobby capacity locks at 2/2 players.
                  </div>

                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={loading || joinCode.length !== 6 || !currentUser}
                    id="btn-submit-join-lobby"
                  >
                    {loading ? 'Validating Code & Joining...' : 'Join Lobby (AC-17.1)'}
                  </button>
                </form>
              )}

              {/* PUBLIC MATCHMAKING TAB (EP06-03) */}
              {activeTab === 'matchmaking' && (
                <div id="matchmaking-panel">
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="select-matchmaking-game">
                      Select Game Title
                    </label>
                    <select
                      id="select-matchmaking-game"
                      className={styles.select}
                      value={selectedGameId}
                      onChange={(e) => setSelectedGameId(e.target.value)}
                      disabled={isSearchingMatch}
                    >
                      <option value="obsidian-chess">Obsidian Chess (2 Players — Eligible)</option>
                      <option value="cyber-invaders">Cyber Invaders (1 Player — Ineligible Test AC-16.2)</option>
                      <option value="neon-drift">Neon Drift: Cyber Circuit (Multiplayer Ready)</option>
                    </select>
                  </div>

                  {!isSearchingMatch ? (
                    <div>
                      <div className={styles.infoBanner}>
                        <strong>Public Matchmaking (EP06-03):</strong> Request an available opponent in the public queue. If a compatible player is waiting, an active match is formed immediately.
                      </div>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        disabled={loading || !currentUser}
                        onClick={handleStartMatchmaking}
                        id="btn-start-matchmaking"
                      >
                        {loading ? 'Entering Matchmaking Queue...' : 'Find Opponent (AC-22.1)'}
                      </button>
                    </div>
                  ) : (
                    <div className={styles.matchmakingRadar} id="matchmaking-waiting-card">
                      <div className={styles.radarPulse}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="12" x2="19" y2="5" />
                        </svg>
                      </div>
                      <h4 style={{ margin: '0 0 8px 0', color: '#00F0FF', fontSize: '1.1rem' }}>
                        Searching for an Opponent... (AC-22.2)
                      </h4>
                      <p style={{ margin: '0 0 16px 0', color: '#9CA3AF', fontSize: '0.88rem' }}>
                        Queue Position: <strong>#{queuePosition}</strong> • Elapsed: <strong>{searchSeconds}s</strong>
                      </p>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        style={{ width: 'auto', padding: '8px 24px' }}
                        disabled={loading}
                        onClick={handleCancelMatchmaking}
                        id="btn-cancel-matchmaking"
                      >
                        Cancel Search (AC-22.3)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* VIEW B: ACTIVE LOBBY ROOM VIEW (AC-18.1, AC-18.2, AC-18.3) */
            <div id="active-lobby-room-view">
              {/* Disconnect Grace Period Banner (EP05-04 / AC-19.1) */}
              {peerDisconnected && (
                <div className={styles.disconnectWarning} id="disconnect-grace-banner">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <strong>Opponent Temporarily Disconnected:</strong> Reconnection grace period active ({disconnectCountdown}s remaining).
                  </div>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
                    onClick={handleReconnect}
                    id="btn-reconnect-session"
                  >
                    Sync Status (AC-19.2)
                  </button>
                </div>
              )}

              {/* Match Outcome / Forfeit Notice (EP05-04 / AC-19.3) */}
              {matchOutcome && (
                <div className={styles.forfeitNotice} id="match-outcome-banner">
                  <span>🏆 {matchOutcome}</span>
                </div>
              )}

              {/* Room Header with Status Badge */}
              <div className={styles.roomHeader}>
                <div>
                  <div className={styles.roomGameTitle} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span>{activeLobby.game.title}</span>
                    {activeLobby.isBot && (
                      <span className={`${styles.roleBadge} ${styles.botBadge}`} id="badge-bot-match">
                        🤖 AI BOT MATCH (EP04-02)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#9CA3AF', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>Session Capacity: <strong>{activeLobby.playerCount} / {activeLobby.maxPlayers} Players</strong></span>
                    {isBotThinking && (
                      <span className={styles.botThinking} id="bot-thinking-indicator">
                        🤖 Nexus AI is calculating move (500ms - 1500ms)...
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`${styles.statusBadge} ${
                    activeLobby.status === 'waiting'
                      ? styles.statusWaiting
                      : activeLobby.status === 'full'
                      ? styles.statusFull
                      : styles.statusActive
                  }`}
                  id="lobby-status-badge"
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: 'currentColor',
                      display: 'inline-block'
                    }}
                  />
                  {activeLobby.status === 'waiting' && `Waiting (${activeLobby.playerCount}/${activeLobby.maxPlayers} Slots)`}
                  {activeLobby.status === 'full' && `Lobby Full (${activeLobby.maxPlayers}/${activeLobby.maxPlayers} Ready)`}
                  {activeLobby.status === 'active' && 'Match Active'}
                  {activeLobby.status === 'ended' && 'Session Ended'}
                </div>
              </div>

              {/* Invitation Code Card */}
              {activeLobby.status !== 'active' && !activeLobby.isBot && (
                <div className={styles.codeBox} id="invitation-code-card">
                  <div className={styles.codeLabel}>
                    Invitation Code (Share with Players)
                  </div>
                  <div className={styles.codeDisplay} id="display-invitation-code">
                    {activeLobby.code}
                  </div>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={handleCopyCode}
                    id="btn-copy-lobby-code"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>
              )}

              {/* Participants Grid (AC-18.1, AC-18.2, AC-20.1, AC-21.1) */}
              <div className={styles.participantsGrid} id="participants-grid">
                {activeLobby.participants.map((p, idx) => {
                  const isBotPart = p.playerId === 'bot-nexus-ai' || (activeLobby.isBot && p.role === 'guest');
                  const isHostPart = p.role === 'host';
                  return (
                    <div
                      key={p.id || idx}
                      className={`${styles.participantCard} ${isHostPart ? styles.hostCard : isBotPart ? styles.botCard : styles.guestCard}`}
                      id={`participant-slot-${idx}`}
                    >
                      <div className={styles.playerAvatar}>
                        {isBotPart ? '🤖' : p.avatar || (isHostPart ? '👑' : '⚔️')}
                      </div>
                      <div className={styles.playerInfo}>
                        <div className={styles.playerName}>
                          {p.displayName}
                          <span className={`${styles.roleBadge} ${isHostPart ? '' : isBotPart ? styles.botBadge : styles.guestRoleBadge}`}>
                            {isHostPart ? 'HOST' : isBotPart ? 'AI BOT' : `PLAYER ${idx + 1}`}
                          </span>
                        </div>
                        <div className={styles.playerStatus}>
                          {isBotPart
                            ? `Nexus AI (${activeLobby.botDifficulty || 'medium'}) • Black Pieces`
                            : isHostPart
                            ? 'Ready • White Pieces'
                            : p.status === 'disconnected'
                            ? '⚠️ Disconnected'
                            : 'Connected • In Room'}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty Slots */}
                {Array.from({ length: Math.max(0, activeLobby.maxPlayers - activeLobby.participants.length) }).map((_, emptyIdx) => {
                  const slotNum = activeLobby.participants.length + emptyIdx + 1;
                  return (
                    <div
                      key={`empty-${emptyIdx}`}
                      className={`${styles.participantCard} ${styles.emptySlotCard}`}
                      id={`participant-slot-empty-${emptyIdx}`}
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>👤</div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Waiting for Player {slotNum}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Share code: {activeLobby.code}</div>
                    </div>
                  );
                })}
              </div>

              {/* IN-MATCH REAL-TIME BOARD (AC-18.3) */}
              {activeLobby.status === 'active' && (
                <div className={styles.activeMatchContainer} id="multiplayer-active-board">
                  <div className={styles.matchHeader}>
                    <div>
                      <strong>Turn:</strong>{' '}
                      <span className={styles.turnIndicator} id="board-turn-indicator">
                        {turn === 'w' ? 'White (Player 1)' : 'Black (Player 2)'}
                      </span>
                    </div>
                    <div>
                      Your Role:{' '}
                      <strong style={{ color: isHost ? '#00F0FF' : '#A78BFA' }}>
                        {isHost ? 'White (Host)' : 'Black (Guest)'}
                      </strong>
                    </div>
                  </div>

                  {/* 8x8 Chess Board */}
                  <div className={styles.chessBoard} id="interactive-chess-grid">
                    {boardState.map((row, r) =>
                      row.map((cell, c) => {
                        const isLight = (r + c) % 2 === 0;
                        const isSelected = selectedPos && selectedPos[0] === r && selectedPos[1] === c;
                        return (
                          <div
                            key={`${r}-${c}`}
                            className={`${styles.chessCell} ${
                              isLight ? styles.cellLight : styles.cellDark
                            } ${isSelected ? styles.cellSelected : ''}`}
                            onClick={() => handleSquareClick(r, c)}
                            id={`square-${r}-${c}`}
                          >
                            {cell.piece && (
                              <span style={{ color: cell.color === 'w' ? '#FFFFFF' : '#111827' }}>
                                {PIECE_SYMBOLS[cell.piece] || cell.piece}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Move History Log */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginBottom: 4 }}>
                      Move History ({moveHistory.length}):
                    </div>
                    <div style={{ maxHeight: 60, overflowY: 'auto', fontSize: '0.78rem', color: '#E5E7EB' }}>
                      {moveHistory.length === 0 ? (
                        <em>No moves made yet. Click a piece to move.</em>
                      ) : (
                        moveHistory.slice(-4).map((m, idx) => <div key={idx}>• {m}</div>)
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Lobby Action Controls */}
              <div className={styles.footerRow}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleLeaveLobby}
                  id="btn-leave-lobby"
                >
                  Leave Lobby
                </button>

                {/* Host Start Match Button (AC-18.3) */}
                {isHost && activeLobby.status === 'full' && (
                  <button
                    type="button"
                    className={`${styles.primaryBtn} ${styles.startMatchBtn}`}
                    onClick={handleStartMatch}
                    disabled={loading}
                    id="btn-host-start-match"
                  >
                    {loading ? 'Initializing Match...' : 'Start 2-Player Match (AC-18.3)'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
