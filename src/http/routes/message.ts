/**
 * Message sending endpoint
 */

import { Router } from 'express';
import type { AgentService } from '../../application/agent.js';
import type { SessionService } from '../../application/session.js';
import type { SSEService } from '../../application/sse.js';
import { postMessageSchema } from '../validation.js';
import { logger } from '../../shared/logger.js';

export function createMessageRouter(
  agentService: AgentService,
  sessionService: SessionService,
  sseService: SSEService
): Router {
  const router = Router();

  router.post('/message', async (req, res) => {
    // Validate request body
    const result = postMessageSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        type: 'about:blank',
        title: 'Invalid request',
        status: 400,
        detail: result.error.message,
      });
    }

    const { content } = result.data;

    // Check if agent is busy
    const status = agentService.getStatus();
    if (status.status === 'running') {
      return res.status(503).json({
        type: 'about:blank',
        title: 'Agent is busy',
        status: 503,
        detail: 'The agent is currently processing another request',
      });
    }

    // Add user message to session
    sessionService.addMessage({
      role: 'user',
      content,
    });

    // Broadcast user message via SSE
    sseService.broadcast({
      type: 'message',
      data: { role: 'user', content },
    });

    // Send to agent asynchronously (errors are handled inside agentService)
    agentService.sendMessage(content).catch((error) => {
      logger.error('Unexpected error processing message:', error);
    });

    return res.json({ ok: true });
  });

  return router;
}
