/**
 * SSEService tests
 */

import { describe, it, expect, vi } from 'vitest';
import { SSEService } from '../../application/sse.js';
import type { Response } from 'express';

describe('SSEService', () => {
  it('should add client and set headers', () => {
    const service = new SSEService();
    const mockRes = {
      writeHead: vi.fn(),
      write: vi.fn(),
      on: vi.fn(),
    } as unknown as Response;

    service.addClient('client1', mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }));
    expect(service.getClientCount()).toBe(1);
  });

  it('should broadcast to all clients', () => {
    const service = new SSEService();
    const mockRes1 = {
      writeHead: vi.fn(),
      write: vi.fn(),
      on: vi.fn(),
    } as unknown as Response;
    const mockRes2 = {
      writeHead: vi.fn(),
      write: vi.fn(),
      on: vi.fn(),
    } as unknown as Response;

    service.addClient('client1', mockRes1);
    service.addClient('client2', mockRes2);

    service.broadcast({ type: 'test', data: { message: 'hello' } });

    expect(mockRes1.write).toHaveBeenCalledWith(expect.stringContaining('event: test'));
    expect(mockRes2.write).toHaveBeenCalledWith(expect.stringContaining('event: test'));
  });
});
