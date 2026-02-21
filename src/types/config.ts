/**
 * Configuration types
 */

import type { SandboxMode, ApprovalMode } from '@openai/codex-sdk';

export interface MCPServerConfig {
  /** stdio型: 実行コマンド */
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  /** HTTP型: サーバータイプ ("http" | "stdio") */
  type?: 'http' | 'stdio';
  /** HTTP型: エンドポイントURL */
  url?: string;
  /** HTTP型: リクエストヘッダー */
  headers?: Record<string, string>;
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
  sandboxMode?: SandboxMode;
  /** Codex approval policy: 'never' | 'on-request' | 'on-failure' | 'untrusted' */
  approvalPolicy?: ApprovalMode;
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
