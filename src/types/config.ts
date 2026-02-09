/**
 * Configuration types
 */

export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers?: Record<string, MCPServerConfig>;
}

export interface SkillConfig {
  plugins?: Record<string, {
    enabled: boolean;
    config?: Record<string, unknown>;
  }>;
}

export interface ClaudeConfig extends MCPConfig, SkillConfig {}

export interface AgentConfig {
  apiKey?: string;
  workingDirectory?: string;
  env?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  codexConfig?: any;
}

export interface ServerConfig {
  port: number;
  host: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface Config {
  agent: AgentConfig;
  server: ServerConfig;
  claude?: ClaudeConfig;
}
