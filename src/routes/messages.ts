/**
 * Messages retrieval endpoint with pagination
 */

import { Router } from 'express';
import type { SessionService } from '../services/session.js';
import { paginationSchema } from '../utils/validation.js';

export function createMessagesRouter(sessionService: SessionService): Router {
  const router = Router();

  router.get('/messages', (req, res) => {
    // Validate pagination parameters
    const result = paginationSchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        type: 'about:blank',
        title: 'Invalid query parameters',
        status: 400,
        detail: result.error.message,
      });
    }

    const params = result.data;
    const response = sessionService.getMessages(params);

    return res.json(response);
  });

  return router;
}
