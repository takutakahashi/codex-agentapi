/**
 * Server-Sent Events endpoint
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import type { SSEService } from '../../application/sse.js';

export function createEventsRouter(sseService: SSEService): Router {
  const router = Router();

  router.get('/events', (_req, res) => {
    const clientId = randomUUID();
    sseService.addClient(clientId, res);
  });

  return router;
}
