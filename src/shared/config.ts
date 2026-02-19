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
 *
 * Search order:
 * 1. Explicit configPath argument
 * 2. CLAUDE_CONFIG_PATH environment variable
 * 3. <cwd>/.claude/config.json
 * 4. ~/.claude/config.json
 */
export function loadClaudeConfig(configPath?: string): ClaudeConfig {
  const paths = [
    configPath,
    process.env.CLAUDE_CONFIG_PATH,
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
 * Initialize ~/.codex/config.toml to read OPENAI_API_KEY from environment.
 * The codex binary does not read OPENAI_API_KEY automatically; a custom
 * model provider with env_key must be declared in config.toml.
 */
export function initCodexConfig(): void {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY is not set; codex will not be able to authenticate');
    return;
  }

  const codexDir = path.join(homedir(), '.codex');
  const configPath = path.join(codexDir, 'config.toml');

  if (fs.existsSync(configPath)) {
    return;
  }

  const toml = [
    'model_provider = "openai-api"',
    '',
    '[model_providers.openai-api]',
    'name = "OpenAI (API key from env)"',
    'base_url = "https://api.openai.com/v1"',
    'wire_api = "responses"',
    'env_key = "OPENAI_API_KEY"',
    'requires_openai_auth = false',
  ].join('\n') + '\n';

  try {
    fs.mkdirSync(codexDir, { recursive: true });
    fs.writeFileSync(configPath, toml, 'utf-8');
    logger.info(`Created codex config at: ${configPath}`);
  } catch (error) {
    logger.warn('Failed to create codex config.toml:', error);
  }
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
