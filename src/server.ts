/**
 * Express server setup
 */

import express from 'express';
import type { Config } from './types/config.js';
import { AgentService } from './services/agent.js';
import { SessionService } from './services/session.js';
import { SSEService } from './services/sse.js';
import { MCPService } from './services/mcp.js';
import { SkillService } from './services/skill.js';
import healthRouter from './routes/health.js';
import { createStatusRouter } from './routes/status.js';
import { createMessageRouter } from './routes/message.js';
import { createMessagesRouter } from './routes/messages.js';
import { createToolStatusRouter } from './routes/tool_status.js';
import { createEventsRouter } from './routes/events.js';
import { createActionRouter } from './routes/action.js';
import { logger } from './utils/logger.js';
import path from 'path';

export function createServer(config: Config) {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  // Initialize services
  const sessionService = new SessionService();
  const sseService = new SSEService();

  // Load MCP and Skill configurations
  const mcpService = new MCPService();
  const skillService = new SkillService();

  const configPath = path.join(process.cwd(), '.claude', 'config.json');
  const mcpConfig = mcpService.loadMCPConfig(configPath);
  const skillConfig = skillService.loadSkillConfig(configPath);

  // Prepare Codex configuration
  const mcpEnv = mcpService.prepareMCPEnvironment(mcpConfig);
  const skillEnv = skillService.prepareSkillEnvironment(skillConfig);

  const codexConfig = {
    ...config.agent.codexConfig,
    ...mcpEnv,
    ...skillEnv,
  };

  const agentService = new AgentService(
    {
      ...config.agent,
      codexConfig,
    },
    sessionService,
    sseService
  );

  // Register routes
  app.use(healthRouter);
  app.use(createStatusRouter(agentService));
  app.use(createMessageRouter(agentService, sessionService, sseService));
  app.use(createMessagesRouter(sessionService));
  app.use(createToolStatusRouter(sessionService));
  app.use(createEventsRouter(sseService));
  app.use(createActionRouter(agentService));

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      type: 'about:blank',
      title: 'Internal server error',
      status: 500,
      detail: err.message,
    });
  });

  return app;
}
