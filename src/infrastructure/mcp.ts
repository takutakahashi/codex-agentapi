/**
 * MCP (Model Context Protocol) server configuration service
 */

import fs from 'fs';
import type { MCPConfig } from '../types/config.js';
import { logger } from '../shared/logger.js';

export class MCPService {
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
   * Prepare MCP environment for Codex CLI
   *
   * Note: @openai/codex-sdk wraps the Codex CLI binary.
   * MCP servers need to be configured in the Codex CLI configuration.
   * This method prepares the configuration that can be passed to Codex constructor.
   */
  prepareMCPEnvironment(config: MCPConfig): Record<string, unknown> {
    if (!config.mcpServers || Object.keys(config.mcpServers).length === 0) {
      return {};
    }

    // Convert .claude/config.json MCP format to Codex config format
    // This is a placeholder - actual implementation depends on Codex CLI config format
    const codexConfig: Record<string, unknown> = {};

    // Codex CLI might support MCP servers through config
    // For now, we log the configuration
    logger.info('MCP servers configured:', Object.keys(config.mcpServers));

    return codexConfig;
  }
}
