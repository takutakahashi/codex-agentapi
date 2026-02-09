/**
 * Agent status endpoint
 */

import { Router } from 'express';
import type { AgentService } from '../services/agent.js';

export function createStatusRouter(agentService: AgentService): Router {
  const router = Router();

  router.get('/status', (_req, res) => {
    const status = agentService.getStatus();

    res.json({
      agent_type: 'codex',
      status: status.status,
    });
  });

  return router;
}
