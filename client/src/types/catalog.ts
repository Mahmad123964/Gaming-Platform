export interface GameCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  published_game_count?: number;
}

export interface GameMode {
  type: 'single_player' | 'multiplayer';
  label: string;
  supportsBots: boolean;
}

export interface GameAccess {
  tier: 'free' | 'premium';
  label: string;
  requiresSubscription: boolean;
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  description: string;
  launchUrl: string;
  isPublished: boolean;
  isPremium: boolean;
  minPlayers: number;
  maxPlayers: number;
  supportsBots: boolean;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  mode: GameMode;
  access: GameAccess;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CatalogResponse {
  games: Game[];
  pagination: CatalogPagination;
  timestamp: string;
}

export interface CategoriesResponse {
  categories: GameCategory[];
  timestamp: string;
}

export interface GameDetailsResponse {
  game: Game;
  timestamp: string;
}
