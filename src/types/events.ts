/**
 * Server-Sent Events types
 */

export interface SSEEvent {
  type: string;
  data: unknown;
}

export interface MessageEvent extends SSEEvent {
  type: 'message';
  data: {
    role: string;
    content: string;
  };
}

export interface ToolStartEvent extends SSEEvent {
  type: 'tool_start';
  data: {
    id: string;
    name: string;
  };
}

export interface ToolEndEvent extends SSEEvent {
  type: 'tool_end';
  data: {
    id: string;
    status: 'success' | 'error';
  };
}

export interface StatusChangeEvent extends SSEEvent {
  type: 'status_change';
  data: {
    status: 'running' | 'stable';
  };
}
