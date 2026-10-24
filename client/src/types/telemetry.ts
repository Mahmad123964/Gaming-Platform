export interface HealthData {
  status: 'healthy' | 'DEGRADED';
  database: 'connected' | 'unhealthy';
  environment: string;
  uptimeSeconds: number;
  memory?: {
    rssMB: number;
    heapUsedMB: number;
  };
  timestamp: string;
}

export interface PlatformMetadata {
  platform: string;
  version: string;
  activeSprint: string;
  phase: string;
  environment: string;
  features: Record<string, string>;
  timestamp: string;
}

export interface TerminalEntry {
  id: string;
  time: string;
  message: string;
  type: 'green' | 'blue' | 'yellow' | 'rose' | 'dim';
}
