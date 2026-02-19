/**
 * Health endpoint tests
 */

import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import healthRouter from '../../http/routes/health.js';

describe('GET /health', () => {
  const app = express();
  app.use(healthRouter);

  it('should return 200 with status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
