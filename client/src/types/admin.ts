export type LicensingStatus = 'approved' | 'pending' | 'rejected' | 'suspended';

export interface LicensingRecord {
  id: string | null;
  status: LicensingStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
}

export interface AdminGameCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface AdminGame {
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
  category: AdminGameCategory | null;
  licensing: LicensingRecord;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGamesPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminGamesResponse {
  games: AdminGame[];
  pagination: AdminGamesPagination;
  timestamp: string;
}

export interface CreateGamePayload {
  title: string;
  slug: string;
  categoryId: string;
  description: string;
  launchUrl: string;
  minPlayers: number;
  maxPlayers: number;
  isPremium: boolean;
  supportsBots: boolean;
}

export interface UpdateGamePayload {
  title: string;
  slug: string;
  categoryId: string;
  description: string;
  launchUrl: string;
  minPlayers: number;
  maxPlayers: number;
  isPremium: boolean;
  supportsBots: boolean;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  actorName: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  resource: string;
  details: Record<string, any>;
  createdAt: string;
}
