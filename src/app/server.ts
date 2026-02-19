/**
 * Express server setup
 */

import express from 'express';
import type { Config } from '../types/config.js';
import { AgentService } from '../application/agent.js';
import { SessionService } from '../application/session.js';
import { SSEService } from '../application/sse.js';
import { MCPService } from '../infrastructure/mcp.js';
import { SkillService } from '../infrastructure/skill.js';
import { buildCodexConfig } from '../infrastructure/codex_config.js';
import healthRouter from '../http/routes/health.js';
import { createStatusRouter } from '../http/routes/status.js';
import { createMessageRouter } from '../http/routes/message.js';
import { createMessagesRouter } from '../http/routes/messages.js';
import { createToolStatusRouter } from '../http/routes/tool_status.js';
import { createEventsRouter } from '../http/routes/events.js';
import { createActionRouter } from '../http/routes/action.js';
import { logger } from '../shared/logger.js';

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

  const codexConfig = buildCodexConfig(
    config.agent.codexConfig,
    config.claude,
    mcpService,
    skillService
  );

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
