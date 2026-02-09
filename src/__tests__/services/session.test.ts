/**
 * SessionService tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionService } from '../../services/session.js';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService();
  });

  describe('addMessage', () => {
    it('should add message with auto-increment ID', () => {
      const msg1 = service.addMessage({ role: 'user', content: 'Hello' });
      const msg2 = service.addMessage({ role: 'assistant', content: 'Hi' });

      expect(msg1.id).toBe(0);
      expect(msg2.id).toBe(1);
      expect(msg1.content).toBe('Hello');
      expect(msg2.content).toBe('Hi');
    });

    it('should add timestamp to messages', () => {
      const msg = service.addMessage({ role: 'user', content: 'Test' });

      expect(msg.time).toBeDefined();
      expect(new Date(msg.time).getTime()).toBeGreaterThan(0);
    });
  });

  describe('getMessages', () => {
    beforeEach(() => {
      // Add some test messages
      for (let i = 0; i < 10; i++) {
        service.addMessage({ role: i % 2 === 0 ? 'user' : 'assistant', content: `Message ${i}` });
      }
    });

    it('should return all messages by default', () => {
      const result = service.getMessages({});

      expect(result.messages.length).toBe(10);
      expect(result.total).toBe(10);
    });

    it('should handle limit with tail direction', () => {
      const result = service.getMessages({ limit: 3, direction: 'tail' });

      expect(result.messages.length).toBe(3);
      expect(result.messages[0].content).toBe('Message 7');
    });

    it('should handle limit with head direction', () => {
      const result = service.getMessages({ limit: 3, direction: 'head' });

      expect(result.messages.length).toBe(3);
      expect(result.messages[0].content).toBe('Message 0');
    });

    it('should handle around-based pagination', () => {
      const result = service.getMessages({ around: 5, context: 2 });

      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages.some(m => m.id === 5)).toBe(true);
    });

    it('should handle after cursor', () => {
      const result = service.getMessages({ after: 5 });

      expect(result.messages.every(m => m.id > 5)).toBe(true);
    });

    it('should handle before cursor', () => {
      const result = service.getMessages({ before: 5 });

      expect(result.messages.every(m => m.id < 5)).toBe(true);
    });
  });

  describe('activeTools', () => {
    it('should add and remove active tools', () => {
      service.addActiveTool('tool1', 'test-command');

      let tools = service.getActiveTools();
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe('test-command');

      service.removeActiveTool('tool1');
      tools = service.getActiveTools();
      expect(tools.length).toBe(0);
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages and reset counter', () => {
      service.addMessage({ role: 'user', content: 'Test' });
      service.clearMessages();

      const result = service.getMessages({});
      expect(result.messages.length).toBe(0);

      const newMsg = service.addMessage({ role: 'user', content: 'New' });
      expect(newMsg.id).toBe(0);
    });
  });
});
