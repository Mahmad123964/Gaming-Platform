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

export type CommercialModel = 
  | 'FREE' 
  | 'FREE_TO_PLAY_WITH_PURCHASES' 
  | 'PAID_ONE_TIME' 
  | 'SUBSCRIPTION_OPTIONAL' 
  | 'EXTERNAL_STORE' 
  | 'UNAVAILABLE_PENDING_LICENSE';

export type GameActionState = 
  | 'PLAY_NOW' 
  | 'PURCHASE' 
  | 'OPEN_OFFICIAL_STORE' 
  | 'COMING_SOON' 
  | 'NOT_AVAILABLE_IN_YOUR_REGION';

export interface GameDistribution {
  externalStoreUrl?: string | null;
  externalStoreName?: string | null;
  publisher?: string | null;
  developer?: string | null;
  contentRating?: string | null;
  supportedPlatforms?: string[];
  regionRestrictions?: string[];
}

export interface GamePricing {
  countryCode: string;
  currency: string;
  priceMinor: number;
  priceDisplay: string;
  isFree: boolean;
  isOwned?: boolean;
}

export interface Game {
  id: string;
  title: string;
  slug: string;
  description: string;
  launchUrl: string;
  isPublished: boolean;
  isPremium: boolean;
  commercialModel?: CommercialModel;
  actionState?: GameActionState;
  isFree?: boolean;
  distribution?: GameDistribution;
  pricing?: GamePricing;
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
