/**
 * Action endpoints for handling questions, plans, and agent control
 */

import { Router } from 'express';
import type { AgentService } from '../../application/agent.js';
import { actionSchema } from '../validation.js';
import { logger } from '../../shared/logger.js';

export function createActionRouter(agentService: AgentService): Router {
  const router = Router();

  // Get pending actions
  router.get('/action', (_req, res) => {
    // TODO: Implement pending actions retrieval
    // This depends on how @openai/codex-sdk handles user input requests
    // For now, return empty array
    res.json({
      pending_actions: [],
    });
  });

  // Send action response
  router.post('/action', async (req, res) => {
    // Validate request body
    const result = actionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        type: 'about:blank',
        title: 'Invalid request',
        status: 400,
        detail: result.error.message,
      });
    }

    const action = result.data;

    try {
      switch (action.type) {
        case 'answer_question':
          // TODO: Implement question answering
          logger.info('Answering question:', action.answers);
          break;

        case 'approve_plan':
          // TODO: Implement plan approval
          logger.info('Plan approval:', action.approved);
          break;

        case 'stop_agent':
          agentService.stop();
          logger.info('Agent stopped by user');
          break;
      }

      return res.json({ ok: true });
    } catch (error) {
      logger.error('Error processing action:', error);
      return res.status(500).json({
        type: 'about:blank',
        title: 'Internal server error',
        status: 500,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
