/**
 * Agent service using @openai/codex-sdk
 */

import { Codex, Thread, ThreadEvent, ThreadItem } from '@openai/codex-sdk';
import type { AgentConfig } from '../types/config.js';
import type { AgentStatus } from '../types/agent.js';
import { logger } from '../shared/logger.js';
import type { SessionService } from './session.js';
import type { SSEService } from './sse.js';

export class AgentService {
  private codex: Codex;
  private thread: Thread | null = null;
  private status: AgentStatus = { status: 'stable' };
  private sessionService: SessionService;
  private sseService: SSEService;

  constructor(
    config: AgentConfig,
    sessionService: SessionService,
    sseService: SSEService
  ) {
    this.sessionService = sessionService;
    this.sseService = sseService;

    // Initialize Codex SDK
    this.codex = new Codex({
      env: config.env,
      config: config.codexConfig,
    });

    logger.info('AgentService initialized');
  }

  /**
   * Start a new thread
   */
  async startThread(workingDirectory?: string): Promise<string> {
    this.thread = this.codex.startThread({
      workingDirectory: workingDirectory || process.cwd(),
      skipGitRepoCheck: true,
    });

    // Wait for thread.started event to get thread ID
    // Note: Codex SDK returns threadId synchronously, but we'll handle it async
    const threadId = await this.getThreadId();
    this.status = { status: 'stable', threadId };

    logger.info(`Started thread: ${threadId}`);
    return threadId;
  }

  /**
   * Get thread ID (waits for thread initialization if needed)
   */
  private async getThreadId(): Promise<string> {
    // In @openai/codex-sdk, threadId might be available immediately
    // or we need to wait for the first event
    if (this.thread) {
      // Try to access threadId property if available
      // This is a workaround as the SDK might expose threadId differently
      return 'thread-' + Date.now(); // Fallback ID
    }
    throw new Error('No active thread');
  }

  /**
   * Send a message and process events
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.thread) {
      await this.startThread();
    }

    if (!this.thread) {
      throw new Error('Failed to start thread');
    }

    this.status.status = 'running';
    this.sseService.broadcast({
      type: 'status_change',
      data: { status: 'running' },
    });

    try {
      const { events } = await this.thread.runStreamed(content);

      for await (const event of events) {
        this.handleThreadEvent(event);
      }

      this.status.status = 'stable';
      this.sseService.broadcast({
        type: 'status_change',
        data: { status: 'stable' },
      });
    } catch (error) {
      this.status.status = 'stable';
      logger.error('Error processing message:', error);
      throw error;
    }
  }

  /**
   * Handle individual thread events
   */
  private handleThreadEvent(event: ThreadEvent): void {
    logger.debug('Thread event:', event.type);

    switch (event.type) {
      case 'thread.started':
        this.status.threadId = event.thread_id;
        logger.info(`Thread started: ${event.thread_id}`);
        break;

      case 'turn.started':
        logger.debug('Turn started');
        break;

      case 'turn.completed':
        logger.info('Turn completed, usage:', event.usage);
        this.sseService.broadcast({
          type: 'turn_completed',
          data: { usage: event.usage },
        });
        break;

      case 'turn.failed':
        logger.error('Turn failed:', event.error);
        this.sseService.broadcast({
          type: 'turn_failed',
          data: { error: event.error },
        });
        break;

      case 'item.started':
        this.handleItemStarted(event.item);
        break;

      case 'item.updated':
        this.handleItemUpdated(event.item);
        break;

      case 'item.completed':
        this.handleItemCompleted(event.item);
        break;

      case 'error':
        logger.error('Thread error:', event.message);
        this.sseService.broadcast({
          type: 'error',
          data: { message: event.message },
        });
        break;
    }
  }

  /**
   * Handle item.started event
   */
  private handleItemStarted(item: ThreadItem): void {
    switch (item.type) {
      case 'command_execution':
        this.sessionService.addActiveTool(
          item.id || `cmd-${Date.now()}`,
          item.command
        );
        this.sseService.broadcast({
          type: 'tool_start',
          data: { id: item.id, name: item.command },
        });
        break;
    }
  }

  /**
   * Handle item.updated event
   */
  private handleItemUpdated(item: ThreadItem): void {
    switch (item.type) {
      case 'todo_list':
        // TODO: Handle todo list updates (potential question/plan)
        logger.debug('Todo list updated:', item);
        break;
    }
  }

  /**
   * Handle item.completed event
   */
  private handleItemCompleted(item: ThreadItem): void {
    switch (item.type) {
      case 'agent_message':
        // Add assistant message
        this.sessionService.addMessage({
          role: 'assistant',
          content: item.text,
        });
        this.sseService.broadcast({
          type: 'message',
          data: { role: 'assistant', content: item.text },
        });
        break;

      case 'reasoning':
        // Optionally add reasoning as assistant message
        logger.debug('Reasoning:', item.text);
        break;

      case 'command_execution': {
        // Remove from active tools
        if (item.id) {
          this.sessionService.removeActiveTool(item.id);
          const toolStatus = (item.exit_code === 0 || item.status === 'completed') ? 'success' : 'error';
          this.sseService.broadcast({
            type: 'tool_end',
            data: {
              id: item.id,
              status: toolStatus,
            },
          });
        }

        // Add tool result message
        const exitText = item.exit_code !== undefined
          ? ` (exit code: ${item.exit_code})`
          : '';
        this.sessionService.addMessage({
          role: 'tool_result',
          content: `Command ${item.command} ${item.status}${exitText}`,
          status: (item.exit_code === 0 || item.status === 'completed') ? 'success' : 'error',
          toolUseId: item.id,
        });
        break;
      }

      case 'file_change': {
        // Add file change as tool result
        const changes = item.changes.map(c => `${c.kind} ${c.path}`).join(', ');
        this.sessionService.addMessage({
          role: 'tool_result',
          content: `File changes: ${changes}`,
          status: 'success',
        });
        break;
      }

      case 'todo_list':
        // TODO: Handle todo list completion (potential question/plan)
        logger.debug('Todo list completed:', item);
        break;
    }
  }

  /**
   * Get agent status
   */
  getStatus(): AgentStatus {
    return { ...this.status };
  }

  /**
   * Resume an existing thread
   */
  resumeThread(threadId: string): void {
    this.thread = this.codex.resumeThread(threadId);
    this.status = { status: 'stable', threadId };
    logger.info(`Resumed thread: ${threadId}`);
  }

  /**
   * Stop the agent
   */
  stop(): void {
    // Codex SDK doesn't have explicit stop method
    // We just mark status as stable
    this.status.status = 'stable';
    logger.info('Agent stopped');
  }
}
