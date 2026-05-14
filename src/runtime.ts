import type { ModelOption, OfficePlan } from './simulator';

export type RuntimeConnectionState = 'connected' | 'configured' | 'missing' | 'disconnected' | 'error' | 'checking';

export interface RuntimeProvider {
  id: string;
  label: string;
  endpoint: string;
  status: RuntimeConnectionState;
  message?: string;
  defaultModel?: string;
  hermesProvider?: string;
  webHealth?: RuntimeConnectionState;
  models: string[];
}

export interface RuntimeModelOption extends ModelOption {
  available: boolean;
}

export interface RuntimeTelegramStatus {
  configured: boolean;
  connected: boolean;
  canSend: boolean;
  botName: string;
  botUsername: string;
  targetType: string;
  targetName: string;
  targetUsername?: string | null;
  source: string;
  status: RuntimeConnectionState;
  message?: string;
}

export interface RevenueConnector {
  id: string;
  label: string;
  status: RuntimeConnectionState;
  amount: number;
  currency: string;
  source: string;
  detail: string;
}

export interface RuntimeStatus {
  bridge: {
    status: RuntimeConnectionState;
    host: string;
    port: number;
    runtimeDir: string;
    updatedAt: string;
  };
  env: Record<string, boolean>;
  localApis: Record<string, { status: RuntimeConnectionState; endpoint: string; message?: string }>;
  models: {
    providers: RuntimeProvider[];
    options: RuntimeModelOption[];
  };
  telegram: RuntimeTelegramStatus;
  revenue: {
    total: number;
    currency: string;
    connectedCount: number;
    configuredCount: number;
    connectors: RevenueConnector[];
    note: string;
  };
  memory: {
    status: RuntimeConnectionState;
    path: string;
    bytes: number;
    updatedAt: string | null;
    hermesSkillCount: number;
    codexSkillCount: number;
    appliedSkill: boolean;
    proposalDir?: string;
    memoryProposalCount?: number;
    skillProposalDir?: string;
    skillProposalCount?: number;
  };
  skills: {
    total: number;
    hermes: number;
    codex: number;
    appliedPixelSkill: boolean;
  };
  gateways: Array<{ name: string; status: RuntimeConnectionState; detail: string }>;
  git: {
    status: RuntimeConnectionState;
    branch: string;
    dirtyCount: number;
    remote: string;
    message?: string;
  };
}

export interface RuntimeTaskResponse {
  run?: unknown;
  plan?: OfficePlan | null;
  approval?: unknown;
}

export const fallbackRevenueConnectors: RevenueConnector[] = [
  {
    id: 'paypal',
    label: 'PayPal',
    status: 'missing',
    amount: 0,
    currency: 'KRW',
    source: '브릿지 연결 전',
    detail: '실제 PayPal API 확인 전에는 0원입니다.',
  },
  {
    id: 'youtube',
    label: 'YouTube Analytics',
    status: 'missing',
    amount: 0,
    currency: 'KRW',
    source: '브릿지 연결 전',
    detail: '실제 YouTube OAuth 확인 전에는 0원입니다.',
  },
];

export async function fetchRuntimeJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { 'content-type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `${response.status} ${response.statusText}`);
  return payload as T;
}
