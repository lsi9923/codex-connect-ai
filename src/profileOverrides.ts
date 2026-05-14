import type { AgentId } from './agents';

type ProfileSource = {
  id: AgentId;
  name: string;
  profileImage?: string;
};

export type AgentProfileOverride = {
  name?: string;
  profileImage?: string;
};

export type AgentProfileOverrides = Partial<Record<AgentId, AgentProfileOverride>>;

export const PROFILE_STORAGE_KEY = 'connect-ai-agent-profile-overrides';

export function resolveAgentProfile(agent: ProfileSource, overrides: AgentProfileOverrides = {}) {
  const override = overrides[agent.id] || {};
  return {
    name: override.name?.trim() || agent.name,
    profileImage: override.profileImage?.trim() || agent.profileImage || '',
  };
}
