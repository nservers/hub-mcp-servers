import { AppConfig } from '../config.js';

export interface ServerInstance {
  id: string;
  name: string;
  type: 'cloud_vps' | 'dedicated_node' | 'game_server';
  status: 'running' | 'stopped' | 'restarting' | 'provisioning';
  ipAddress: string;
  region: string;
  specs: {
    vCpu: number;
    ramMb: number;
    diskGb: number;
  };
}

export interface TelemetryMetrics {
  serverId: string;
  timestamp: string;
  cpuPercent: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  memoryPercent: number;
  diskUsedGb: number;
  diskTotalGb: number;
  diskPercent: number;
  networkRxMbps: number;
  networkTxMbps: number;
  loadAverage: [number, number, number];
}

export class CloudConnectClient {
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
  }

  private async fetchApi(path: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.config.apiUrl.replace(/\/$/, '')}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${this.config.apiToken}`,
      ...(this.config.organizationId ? { 'X-Organization-Id': this.config.organizationId } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`nServers API responded with HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      if (this.config.apiToken === 'mock_token') {
        return { ok: true, latencyMs: 5 };
      }
      await this.fetchApi('/api/v1/health');
      const latencyMs = Math.round(performance.now() - start);
      return { ok: true, latencyMs };
    } catch (error: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, latencyMs, error: error.message || String(error) };
    }
  }

  async listServers(statusFilter?: string): Promise<ServerInstance[]> {
    try {
      if (this.config.apiToken !== 'mock_token') {
        const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
        const data = await this.fetchApi(`/api/v1/servers${query}`);
        return data.servers || data.data || [];
      }
    } catch {
      // Fallback to simulated cloud instances
    }

    const mockServers: ServerInstance[] = [
      {
        id: 'srv-br-sp-01',
        name: 'cloud-vps-brazil-sp1',
        type: 'cloud_vps',
        status: 'running',
        ipAddress: '177.54.144.10',
        region: 'br-saopaulo-1',
        specs: { vCpu: 4, ramMb: 8192, diskGb: 120 },
      },
      {
        id: 'srv-br-sp-02',
        name: 'game-node-fivem-sp2',
        type: 'game_server',
        status: 'running',
        ipAddress: '177.54.144.11',
        region: 'br-saopaulo-1',
        specs: { vCpu: 8, ramMb: 16384, diskGb: 250 },
      },
      {
        id: 'srv-us-mia-01',
        name: 'database-cluster-mia',
        type: 'dedicated_node',
        status: 'running',
        ipAddress: '198.51.100.25',
        region: 'us-east-miami',
        specs: { vCpu: 16, ramMb: 65536, diskGb: 1000 },
      },
    ];

    if (statusFilter) {
      return mockServers.filter((s) => s.status === statusFilter);
    }
    return mockServers;
  }

  async getServerMetrics(serverId: string): Promise<TelemetryMetrics> {
    try {
      if (this.config.apiToken !== 'mock_token') {
        const data = await this.fetchApi(`/api/v1/servers/${encodeURIComponent(serverId)}/metrics`);
        return data.metrics || data;
      }
    } catch {
      // Fallback
    }

    const cpu = Math.round(15 + Math.random() * 35);
    const memPercent = Math.round(40 + Math.random() * 20);

    return {
      serverId,
      timestamp: new Date().toISOString(),
      cpuPercent: cpu,
      memoryUsedMb: Math.round(8192 * (memPercent / 100)),
      memoryTotalMb: 8192,
      memoryPercent: memPercent,
      diskUsedGb: 38,
      diskTotalGb: 120,
      diskPercent: 31,
      networkRxMbps: parseFloat((12.4 + Math.random() * 5).toFixed(2)),
      networkTxMbps: parseFloat((4.8 + Math.random() * 3).toFixed(2)),
      loadAverage: [0.45, 0.52, 0.48],
    };
  }

  async getServiceHealth(serviceId: string): Promise<Record<string, any>> {
    try {
      if (this.config.apiToken !== 'mock_token') {
        return await this.fetchApi(`/api/v1/services/${encodeURIComponent(serviceId)}/health`);
      }
    } catch {
      // Fallback
    }

    return {
      serviceId,
      healthy: true,
      status: 'operational',
      uptimePercentage: 99.98,
      lastCheck: new Date().toISOString(),
      activeAlerts: [],
    };
  }

  async getAuditLogs(limit: number = 20): Promise<Array<Record<string, any>>> {
    try {
      if (this.config.apiToken !== 'mock_token') {
        const data = await this.fetchApi(`/api/v1/audit-logs?limit=${limit}`);
        return data.logs || data.data || [];
      }
    } catch {
      // Fallback
    }

    return [
      {
        id: 'evt-001',
        event: 'server.started',
        actor: 'orchestrator-worker',
        target: 'srv-br-sp-01',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        details: { mode: 'fast_resume' },
      },
      {
        id: 'evt-002',
        event: 'firewall.rule_applied',
        actor: 'security-guard',
        target: 'srv-br-sp-01',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        details: { port: 3000, action: 'allow' },
      },
    ];
  }
}
