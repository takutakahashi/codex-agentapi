/**
 * Skill (Claude Code plugins) configuration service
 *
 * Reads plugin/skill configurations from:
 * 1. ~/.claude/plugins/installed_plugins.json  — install paths for each plugin
 * 2. ClaudeConfig.plugins                      — enabled/disabled state from .claude/config.json
 *
 * Converts enabled skills into Codex CLI `skills.config` entries so that
 * the Codex binary can load them via `--config skills.config=[{path=...,enabled=...}]`.
 */

import fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import type { SkillConfig, CodexSkillEntry } from '../types/config.js';
import { logger } from '../shared/logger.js';

/** Shape of ~/.claude/plugins/installed_plugins.json */
interface InstalledPluginEntry {
  scope: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  gitCommitSha?: string;
}

interface InstalledPluginsFile {
  version: number;
  plugins: Record<string, InstalledPluginEntry[]>;
}

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
   * Load the installed_plugins.json from ~/.claude/plugins/
   */
  private loadInstalledPlugins(): InstalledPluginsFile | null {
    const pluginsFile = path.join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
    try {
      if (fs.existsSync(pluginsFile)) {
        const content = fs.readFileSync(pluginsFile, 'utf-8');
        return JSON.parse(content) as InstalledPluginsFile;
      }
    } catch (error) {
      logger.warn(`Failed to load installed_plugins.json from ${pluginsFile}:`, error);
    }
    return null;
  }

  /**
   * Find all SKILL.md files under a plugin's install path.
   * Skills can live directly at <installPath>/SKILL.md or under <installPath>/skills/<name>/SKILL.md.
   */
  private findSkillFiles(installPath: string): string[] {
    const skillFiles: string[] = [];

    if (!fs.existsSync(installPath)) {
      return skillFiles;
    }

    // Check top-level SKILL.md
    const topLevel = path.join(installPath, 'SKILL.md');
    if (fs.existsSync(topLevel)) {
      skillFiles.push(topLevel);
    }

    // Check skills/<name>/SKILL.md
    const skillsDir = path.join(installPath, 'skills');
    if (fs.existsSync(skillsDir)) {
      try {
        const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const skillMd = path.join(skillsDir, entry.name, 'SKILL.md');
            if (fs.existsSync(skillMd)) {
              skillFiles.push(skillMd);
            }
          }
        }
      } catch (error) {
        logger.warn(`Failed to read skills directory ${skillsDir}:`, error);
      }
    }

    return skillFiles;
  }

  /**
   * Prepare Skill environment for Codex CLI.
   *
   * Resolves enabled plugins to their SKILL.md paths and returns a
   * CodexConfigObject with `skills.config` populated.
   *
   * @param config - The ClaudeConfig (or SkillConfig) read from .claude/config.json
   * @returns A CodexConfigObject to be merged into the Codex `config` option.
   */
  prepareSkillEnvironment(config: SkillConfig): Record<string, unknown> {
    const plugins = config.plugins;
    if (!plugins || Object.keys(plugins).length === 0) {
      return {};
    }

    const enabledPluginNames = Object.entries(plugins)
      .filter(([, plugin]) => plugin.enabled)
      .map(([name]) => name);

    if (enabledPluginNames.length === 0) {
      return {};
    }

    logger.info('Enabled plugins:', enabledPluginNames);

    // Load installed plugin registry
    const installed = this.loadInstalledPlugins();

    const skillEntries: CodexSkillEntry[] = [];

    for (const pluginName of enabledPluginNames) {
      const pluginConfig = plugins[pluginName];

      // Prefer installPath from config.json, then fall back to installed_plugins.json
      let installPath: string | null = pluginConfig.installPath ?? null;

      if (!installPath && installed) {
        // Plugin keys in installed_plugins.json may be "name@marketplace"
        // Try exact match first, then prefix match
        const matchingKey = Object.keys(installed.plugins).find(
          (k) => k === pluginName || k.startsWith(pluginName + '@')
        );
        if (matchingKey) {
          const entries = installed.plugins[matchingKey];
          if (entries && entries.length > 0) {
            // Use the most recently updated entry
            const sorted = [...entries].sort(
              (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
            );
            installPath = sorted[0].installPath;
          }
        }
      }

      if (!installPath) {
        logger.warn(`Could not resolve install path for plugin: ${pluginName}`);
        continue;
      }

      const skillFiles = this.findSkillFiles(installPath);
      if (skillFiles.length === 0) {
        logger.warn(`No SKILL.md found for plugin: ${pluginName} at ${installPath}`);
        continue;
      }

      for (const skillPath of skillFiles) {
        skillEntries.push({ path: skillPath, enabled: true });
        logger.info(`Configured skill: ${skillPath}`);
      }
    }

    if (skillEntries.length === 0) {
      return {};
    }

    // Codex CLI expects: skills.config = [{path = "...", enabled = true}, ...]
    return {
      skills: {
        config: skillEntries,
      },
    };
  }
}
