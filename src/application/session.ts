/**
 * Session and message management service
 */

import type { Message, MessagesResponseBody, PaginationParams } from '../types/api.js';
import type { ActiveTool } from '../types/agent.js';
import { logger } from '../shared/logger.js';

export class SessionService {
  private messages: Message[] = [];
  private messageIdCounter = 0;
  private activeTools: Map<string, ActiveTool> = new Map();

  /**
   * Add a message to the session
   */
  addMessage(msg: Omit<Message, 'id' | 'time'>): Message {
    const message: Message = {
      id: this.messageIdCounter++,
      time: new Date().toISOString(),
      ...msg,
    };
    this.messages.push(message);
    logger.debug(`Added message ${message.id}:`, message);
    return message;
  }

  /**
   * Get messages with pagination
   */
  getMessages(params: PaginationParams): MessagesResponseBody {
    const total = this.messages.length;
    let filtered = [...this.messages];

    // Apply pagination
    if (params.around !== undefined) {
      // Around-based pagination
      const context = params.context ?? 10;
      const index = filtered.findIndex(m => m.id === params.around);
      if (index >= 0) {
        const start = Math.max(0, index - context);
        const end = Math.min(filtered.length, index + context + 1);
        filtered = filtered.slice(start, end);
      }
    } else if (params.after !== undefined) {
      // Cursor-based pagination (after)
      filtered = filtered.filter(m => m.id > params.after!);
      if (params.limit) {
        filtered = filtered.slice(0, params.limit);
      }
    } else if (params.before !== undefined) {
      // Cursor-based pagination (before)
      filtered = filtered.filter(m => m.id < params.before!);
      if (params.limit) {
        filtered = filtered.slice(-params.limit);
      }
    } else if (params.limit !== undefined) {
      // Limit-based pagination
      const direction = params.direction ?? 'tail';
      if (direction === 'tail') {
        filtered = filtered.slice(-params.limit);
      } else {
        filtered = filtered.slice(0, params.limit);
      }
    }

    const hasMore = filtered.length < total;

    return {
      messages: filtered,
      total,
      hasMore,
    };
  }

  /**
   * Get all messages (including tool messages)
   */
  getAllMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.messages = [];
    this.messageIdCounter = 0;
    logger.info('Cleared all messages');
  }

  /**
   * Add an active tool
   */
  addActiveTool(id: string, name: string): void {
    this.activeTools.set(id, {
      id,
      name,
      status: 'running',
      startTime: new Date().toISOString(),
    });
    logger.debug(`Added active tool: ${name} (${id})`);
  }

  /**
   * Remove an active tool
   */
  removeActiveTool(id: string): void {
    this.activeTools.delete(id);
    logger.debug(`Removed active tool: ${id}`);
  }

  /**
   * Get all active tools
   */
  getActiveTools(): ActiveTool[] {
    return Array.from(this.activeTools.values());
  }

  /**
   * Get total message count
   */
  getTotalMessages(): number {
    return this.messages.length;
  }
}
