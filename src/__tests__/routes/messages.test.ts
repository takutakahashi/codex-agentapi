/**
 * Messages endpoint tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { SessionService } from '../../application/session.js';
import { createMessagesRouter } from '../../http/routes/messages.js';

describe('GET /messages', () => {
  let app: express.Application;
  let sessionService: SessionService;

  beforeEach(() => {
    sessionService = new SessionService();
    app = express();
    app.use(createMessagesRouter(sessionService));

    // Add test messages
    for (let i = 0; i < 5; i++) {
      sessionService.addMessage({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      });
    }
    sessionService.addMessage({
      role: 'tool_result',
      content: 'Command ls completed',
    });
  });

  it('should return all messages', async () => {
    const res = await request(app).get('/messages');

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(6);
    expect(res.body.total).toBe(6);
  });

  it('should handle limit parameter', async () => {
    const res = await request(app).get('/messages?limit=2');

    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(2);
  });

  it('should return 400 for invalid parameters', async () => {
    const res = await request(app).get('/messages?limit=invalid');

    expect(res.status).toBe(400);
    expect(res.body.title).toContain('Invalid');
  });
});
