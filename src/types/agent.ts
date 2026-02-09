/**
 * Agent-related types
 */

export interface ActiveTool {
  id: string;
  name: string;
  status: 'running';
  startTime: string;
}

export interface AgentStatus {
  status: 'running' | 'stable';
  threadId?: string;
}
