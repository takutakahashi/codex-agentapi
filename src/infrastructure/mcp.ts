/**
 * MCP (Model Context Protocol) server configuration service
 */

import fs from 'fs';
import type { MCPConfig } from '../types/config.js';
import { logger } from '../shared/logger.js';

export class MCPService {
  /**
   * ヘッダ値の環境変数プレースホルダー ($VAR または ${VAR}) をプロセス環境変数で展開する
   */
  private resolveEnvVarsInHeaders(
    headers: Record<string, string>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      const expandedValue = value.replace(
        /\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
        (_match, braced: string | undefined, unbraced: string | undefined) => {
          const varName = braced ?? unbraced ?? '';
          return process.env[varName] ?? '';
        }
      );
      resolved[key] = expandedValue;
    }
    return resolved;
  }

  /**
   * Load MCP configuration from .claude/config.json
   */
  loadMCPConfig(configPath: string): MCPConfig {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as MCPConfig;
        logger.info(`Loaded MCP config from: ${configPath}`);
        return config;
      }
    } catch (error) {
      logger.warn(`Failed to load MCP config from ${configPath}:`, error);
    }

    return { mcpServers: {} };
  }

  /**
   * Prepare MCP environment for Codex CLI.
   *
   * Converts .claude/config.json mcpServers format to Codex CLI --config overrides.
   * The Codex CLI expects mcp_servers.<name>.command, mcp_servers.<name>.args, etc.
   *
   * stdio型: command, args, env を使用
   * HTTP型:  type, url, headers を使用 (type が "http" または url が存在する場合)
   *
   * @returns A CodexConfigObject to be merged into the Codex config option.
   */
  prepareMCPEnvironment(config: MCPConfig): Record<string, unknown> {
    if (!config.mcpServers || Object.keys(config.mcpServers).length === 0) {
      return {};
    }

    const mcpServers: Record<string, unknown> = {};

    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      const isHttp = serverConfig.type === 'http' || (serverConfig.url != null && serverConfig.command == null);

      if (isHttp) {
        // HTTP型 MCP サーバー
        const entry: Record<string, unknown> = {
          type: 'http',
          url: serverConfig.url,
        };

        if (serverConfig.headers && Object.keys(serverConfig.headers).length > 0) {
          entry.headers = this.resolveEnvVarsInHeaders(serverConfig.headers);
        }

        // Codex CLI の streamable_http 型は env をサポートしていないため除外する
        if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
          logger.warn(
            `MCP server "${name}" has env configuration but env is not supported for HTTP (streamable_http) servers. The env values will be ignored. Use "headers" for authentication instead.`
          );
        }

        mcpServers[name] = entry;
        logger.info(`Configured HTTP MCP server: ${name}`);
      } else {
        // stdio型 MCP サーバー
        const entry: Record<string, unknown> = {
          command: serverConfig.command,
        };

        if (serverConfig.args && serverConfig.args.length > 0) {
          entry.args = serverConfig.args;
        }

        if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
          entry.env = serverConfig.env;
        }

        mcpServers[name] = entry;
        logger.info(`Configured stdio MCP server: ${name}`);
      }
    }

    return { mcp_servers: mcpServers };
  }
}
