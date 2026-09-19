import Docker from 'dockerode';
import { AppConfig } from '../config.js';

export interface ContainerSummary {
  id: string;
  names: string[];
  image: string;
  state: string;
  status: string;
  created: number;
  ports: Array<{ ip?: string; privatePort: number; publicPort?: number; type: string }>;
}

export class DockerClientWrapper {
  private docker: Docker;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;

    const options: Docker.DockerOptions = {};

    if (config.dockerHost) {
      if (config.dockerHost.startsWith('tcp://') || config.dockerHost.startsWith('http://')) {
        const url = new URL(config.dockerHost.replace('tcp://', 'http://'));
        options.host = url.hostname;
        options.port = url.port ? Number(url.port) : 2375;
      } else {
        options.socketPath = config.dockerHost;
      }
    } else if (config.socketPath) {
      options.socketPath = config.socketPath;
    } else if (process.platform === 'win32') {
      options.socketPath = '//./pipe/docker_engine';
    } else {
      options.socketPath = '/var/run/docker.sock';
    }

    this.docker = new Docker(options);
  }

  async testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      await this.docker.ping();
      const latencyMs = Math.round(performance.now() - start);
      return { ok: true, latencyMs };
    } catch (error: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, latencyMs, error: error.message || String(error) };
    }
  }

  async listContainers(all: boolean = true): Promise<ContainerSummary[]> {
    const containers = await this.docker.listContainers({ all });
    return containers.map((c) => ({
      id: c.Id.substring(0, 12),
      names: c.Names.map((n) => n.replace(/^\//, '')),
      image: c.Image,
      state: c.State,
      status: c.Status,
      created: c.Created,
      ports: c.Ports.map((p) => ({
        ip: p.IP,
        privatePort: p.PrivatePort,
        publicPort: p.PublicPort,
        type: p.Type,
      })),
    }));
  }

  async inspectContainer(containerId: string): Promise<Record<string, any>> {
    const container = this.docker.getContainer(containerId);
    const data = await container.inspect();

    // Sanitize environment variables containing credentials
    const sanitizedEnv = (data.Config.Env || []).map((envStr: string) => {
      const [key, ...rest] = envStr.split('=');
      const val = rest.join('=');
      if (/PASS|SECRET|TOKEN|KEY|CREDENTIAL|PRIVATE/i.test(key)) {
        return `${key}=******`;
      }
      return `${key}=${val}`;
    });

    return {
      id: data.Id.substring(0, 12),
      name: data.Name.replace(/^\//, ''),
      image: data.Config.Image,
      state: data.State,
      created: data.Created,
      restartCount: data.RestartCount,
      networkSettings: {
        ipAddress: data.NetworkSettings.IPAddress,
        ports: data.NetworkSettings.Ports,
        networks: Object.keys(data.NetworkSettings.Networks || {}),
      },
      mounts: (data.Mounts || []).map((m: any) => ({
        type: m.Type,
        source: m.Source,
        destination: m.Destination,
        mode: m.Mode,
        rw: m.RW,
      })),
      env: sanitizedEnv,
    };
  }

  async getContainerLogs(containerId: string, tail: number = 100, timestamps: boolean = false): Promise<string> {
    const container = this.docker.getContainer(containerId);
    const logBuffer = await container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps,
    });

    return logBuffer.toString('utf-8');
  }

  async getContainerStats(containerId: string): Promise<Record<string, any>> {
    const container = this.docker.getContainer(containerId);
    const stats: any = await container.stats({ stream: false });

    // Calculate CPU usage percentage
    let cpuPercent = 0.0;
    if (stats.cpu_stats && stats.precpu_stats) {
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = (stats.cpu_stats.system_cpu_usage || 0) - (stats.precpu_stats.system_cpu_usage || 0);
      const onlineCpus = stats.cpu_stats.online_cpus || stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;

      if (systemDelta > 0.0 && cpuDelta > 0.0) {
        cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100.0;
      }
    }

    const memoryUsage = stats.memory_stats?.usage || 0;
    const memoryLimit = stats.memory_stats?.limit || 1;
    const memoryPercent = (memoryUsage / memoryLimit) * 100.0;

    return {
      id: containerId,
      name: stats.name?.replace(/^\//, ''),
      read: stats.read,
      cpuPercent: parseFloat(cpuPercent.toFixed(2)),
      memoryUsageBytes: memoryUsage,
      memoryLimitBytes: memoryLimit,
      memoryPercent: parseFloat(memoryPercent.toFixed(2)),
      networks: stats.networks,
    };
  }

  async listImages(): Promise<Array<{ id: string; tags: string[]; sizeBytes: number; created: number }>> {
    const images = await this.docker.listImages();
    return images.map((img) => ({
      id: img.Id.replace(/^sha256:/, '').substring(0, 12),
      tags: img.RepoTags || [],
      sizeBytes: img.Size,
      created: img.Created,
    }));
  }
}
