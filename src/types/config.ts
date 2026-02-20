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

/**
 * Plugin entry in .claude/config.json
 * Each plugin may reference skills via SKILL.md files under its install path.
 */
export interface PluginEntry {
  enabled: boolean;
  config?: Record<string, unknown>;
  /** Install path for this plugin (e.g. ~/.claude/plugins/cache/<marketplace>/<name>/<version>) */
  installPath?: string;
}

export interface SkillConfig {
  plugins?: Record<string, PluginEntry>;
}

/**
 * Codex CLI skill config entry (maps to skills.config[] in config.toml)
 */
export interface CodexSkillEntry {
  path: string;
  enabled: boolean;
}

export interface ClaudeConfig extends MCPConfig, SkillConfig {}

export interface AgentConfig {
  apiKey?: string;
  workingDirectory?: string;
  env?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  codexConfig?: any;
  /** Codex sandbox mode: 'read-only' | 'workspace-write' | 'danger-full-access' */
  sandboxMode?: string;
  /** Codex approval policy: e.g. 'never' | 'on-request' | 'on-failure' */
  approvalPolicy?: string;
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
