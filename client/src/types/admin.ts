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

export type TimeWindow = '5m' | '15m' | '1h' | '24h';

export interface OperationalAlert {
  id: string;
  ruleId: string;
  name: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  observedValue: number | string;
  unit?: string;
  threshold: number;
  window: string;
  service: string;
  environment: string;
  onCallTeam: string;
  runbookUrl: string;
  startedAt: string;
  lastObservedAt: string;
  resolvedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

export interface OperationalMetrics {
  telemetryAvailable: boolean;
  status?: string;
  message?: string;
  window: TimeWindow;
  windowDurationSeconds?: number;
  timestamp: string;
  uptimeSeconds?: number;
  overallHealth?: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  availability?: {
    sliPercent: number;
    totalRequests: number;
    requestsPerSecond: number;
    successfulRequests: number;
    serverErrors: number;
    clientErrors: number;
    errorRatePercent: number;
  };
  latency?: {
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    minMs: number;
    maxMs: number;
  };
  system?: {
    cpuPercent: number;
    memory: {
      rssMB: number;
      heapUsedMB: number;
      heapTotalMB: number;
    };
    nodeVersion: string;
    platform: string;
    architecture: string;
  };
  dependencies?: {
    database: {
      engine: string;
      status: string;
      queryLatencyMs: number;
    };
    webSocket: {
      status: string;
      activeConnections: number;
    };
  };
}

