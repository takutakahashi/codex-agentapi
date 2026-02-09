/**
 * API types based on OpenAPI specification
 */

export interface Message {
  id: number;
  role: 'user' | 'assistant' | 'agent' | 'tool_result';
  content: string;
  time: string;
  type?: 'normal' | 'question' | 'plan';
  toolUseId?: string;
  parentToolUseId?: string;
  status?: 'success' | 'error';
  error?: string;
}

export interface MessagesResponseBody {
  $schema?: string;
  messages: Message[];
  total?: number;
  hasMore?: boolean;
}

export interface PostMessageRequest {
  content: string;
  type: 'user' | 'raw';
}

export interface PostMessageResponse {
  ok: boolean;
}

export interface StatusResponse {
  agent_type: string;
  status: 'running' | 'stable';
}

export interface ToolStatusResponseBody {
  $schema?: string;
  messages: Message[];
}

export interface ProblemJson {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export interface AnswerQuestionAction {
  type: 'answer_question';
  answers: Record<string, string>;
}

export interface ApprovePlanAction {
  type: 'approve_plan';
  approved: boolean;
}

export interface StopAgentAction {
  type: 'stop_agent';
}

export type Action = AnswerQuestionAction | ApprovePlanAction | StopAgentAction;

export interface PostActionResponse {
  ok: boolean;
}

export interface PendingAction {
  type: string;
  tool_use_id: string;
  content: unknown;
}

export interface GetActionResponse {
  pending_actions: PendingAction[];
}

export interface PaginationParams {
  limit?: number;
  direction?: 'head' | 'tail';
  around?: number;
  context?: number;
  after?: number;
  before?: number;
}
