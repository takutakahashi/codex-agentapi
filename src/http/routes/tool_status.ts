/**
 * Active tool status endpoint
 */

import { Router } from 'express';
import type { SessionService } from '../../application/session.js';

export function createToolStatusRouter(sessionService: SessionService): Router {
  const router = Router();

  router.get('/tool_status', (_req, res) => {
    const activeTools = sessionService.getActiveTools();

    const messages = activeTools.map(tool => ({
      id: 0, // ID not relevant for active tools
      role: 'agent' as const,
      content: `Executing: ${tool.name}`,
      time: tool.startTime,
      toolUseId: tool.id,
    }));

    res.json({ messages });
  });

  return router;
}
