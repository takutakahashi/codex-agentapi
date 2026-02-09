/**
 * Configuration loader
 */

import fs from 'fs';
import path from 'path';
import { homedir } from 'os';
import dotenv from 'dotenv';
import type { Config, ClaudeConfig } from '../types/config.js';
import { logger } from './logger.js';

dotenv.config();

/**
 * Load Claude config from .claude/config.json
 */
export function loadClaudeConfig(configPath?: string): ClaudeConfig {
  const paths = [
    configPath,
    path.join(process.cwd(), '.claude', 'config.json'),
    path.join(homedir(), '.claude', 'config.json'),
  ].filter(Boolean) as string[];

  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf-8');
        const config = JSON.parse(content) as ClaudeConfig;
        logger.info(`Loaded Claude config from: ${p}`);
        return config;
      }
    } catch (error) {
      logger.warn(`Failed to load config from ${p}:`, error);
    }
  }

  logger.info('No Claude config found, using defaults');
  return {};
}

/**
 * Load application configuration
 */
export function loadConfig(): Config {
  const claudeConfig = loadClaudeConfig();

  const config: Config = {
    agent: {
      apiKey: process.env.OPENAI_API_KEY,
      workingDirectory: process.env.WORKING_DIRECTORY || process.cwd(),
      env: process.env as Record<string, string>,
    },
    server: {
      port: parseInt(process.env.PORT || '9000', 10),
      host: process.env.HOST || 'localhost',
      logLevel: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    },
    claude: claudeConfig,
  };

  logger.setLevel(config.server.logLevel);
  logger.debug('Loaded configuration:', config);

  return config;
}
