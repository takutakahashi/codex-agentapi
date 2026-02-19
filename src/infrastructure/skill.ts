/**
 * Skill (Claude Code plugins) configuration service
 */

import fs from 'fs';
import type { SkillConfig } from '../types/config.js';
import { logger } from '../shared/logger.js';

export class SkillService {
  /**
   * Load Skill configuration from .claude/config.json
   */
  loadSkillConfig(configPath: string): SkillConfig {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content) as SkillConfig;
        logger.info(`Loaded Skill config from: ${configPath}`);
        return config;
      }
    } catch (error) {
      logger.warn(`Failed to load Skill config from ${configPath}:`, error);
    }

    return { plugins: {} };
  }

  /**
   * Prepare Skill environment for Codex CLI
   *
   * Note: Skills/plugins support depends on Codex CLI capabilities.
   * This method prepares the configuration that can be passed to Codex constructor.
   */
  prepareSkillEnvironment(config: SkillConfig): Record<string, unknown> {
    if (!config.plugins || Object.keys(config.plugins).length === 0) {
      return {};
    }

    const enabledPlugins = Object.entries(config.plugins)
      .filter(([_, plugin]) => plugin.enabled)
      .map(([name]) => name);

    if (enabledPlugins.length > 0) {
      logger.info('Enabled plugins:', enabledPlugins);
    }

    // Codex CLI might support plugins through config
    // For now, we log the configuration
    const codexConfig: Record<string, unknown> = {};

    return codexConfig;
  }
}
