export type LobbyStatus = 'waiting' | 'full' | 'active' | 'ended';

export interface LobbyParticipant {
  id: string;
  playerId: string;
  displayName: string;
  avatar: string;
  role: 'host' | 'guest';
  status: 'connected' | 'disconnected' | 'left';
  joinedAt: string;
}

export interface LobbyGameInfo {
  id: string;
  slug: string;
  title: string;
  categoryId?: string;
}

export interface Lobby {
  id: string;
  code: string;
  status: LobbyStatus;
  game: LobbyGameInfo;
  hostPlayerId: string;
  maxPlayers: number;
  playerCount: number;
  isFull: boolean;
  participants: LobbyParticipant[];
  sessionId?: string;
  expiresAt?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface CreateLobbyResponse {
  success: boolean;
  message: string;
  lobby: Lobby;
}

export interface JoinLobbyResponse {
  success: boolean;
  message: string;
  lobby: Lobby;
}
