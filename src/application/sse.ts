/**
 * Server-Sent Events service
 */

import type { Response } from 'express';
import type { SSEEvent } from '../types/events.js';
import { logger } from '../shared/logger.js';

interface SSEClient {
  id: string;
  res: Response;
}

export class SSEService {
  private clients: Map<string, SSEClient> = new Map();

  /**
   * Add a new SSE client
   */
  addClient(id: string, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send initial comment to establish connection
    res.write(': connected\n\n');

    this.clients.set(id, { id, res });
    logger.info(`SSE client connected: ${id}`);

    res.on('close', () => {
      this.clients.delete(id);
      logger.info(`SSE client disconnected: ${id}`);
    });
  }

  /**
   * Broadcast an event to all clients
   */
  broadcast(event: SSEEvent): void {
    const message = this.formatMessage(event);
    logger.debug(`Broadcasting to ${this.clients.size} clients:`, event.type);

    for (const client of this.clients.values()) {
      try {
        client.res.write(message);
      } catch (error) {
        logger.error(`Failed to send to client ${client.id}:`, error);
        this.clients.delete(client.id);
      }
    }
  }

  /**
   * Send an event to a specific client
   */
  sendToClient(clientId: string, event: SSEEvent): void {
    const client = this.clients.get(clientId);
    if (client) {
      const message = this.formatMessage(event);
      try {
        client.res.write(message);
      } catch (error) {
        logger.error(`Failed to send to client ${clientId}:`, error);
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Format an event as SSE message
   */
  private formatMessage(event: SSEEvent): string {
    const data = JSON.stringify(event.data);
    return `event: ${event.type}\ndata: ${data}\n\n`;
  }
}
