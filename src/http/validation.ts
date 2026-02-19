/**
 * Validation schemas using Zod
 */

import { z } from 'zod';

export const postMessageSchema = z.object({
  content: z.string(),
  type: z.enum(['user', 'raw']),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).optional(),
  direction: z.enum(['head', 'tail']).optional(),
  around: z.coerce.number().int().min(0).optional(),
  context: z.coerce.number().int().min(0).optional(),
  after: z.coerce.number().int().min(0).optional(),
  before: z.coerce.number().int().min(0).optional(),
}).refine(
  (data) => {
    // Validate pagination parameter combinations
    if (data.context !== undefined && data.around === undefined) {
      return false;
    }
    if (data.around !== undefined && (data.limit !== undefined || data.direction !== undefined)) {
      return false;
    }
    if (data.after !== undefined && data.before !== undefined) {
      return false;
    }
    if ((data.after !== undefined || data.before !== undefined) &&
        (data.around !== undefined || data.context !== undefined || data.direction !== undefined)) {
      return false;
    }
    return true;
  },
  {
    message: 'Invalid pagination parameter combination',
  }
);

export const answerQuestionActionSchema = z.object({
  type: z.literal('answer_question'),
  answers: z.record(z.string()),
});

export const approvePlanActionSchema = z.object({
  type: z.literal('approve_plan'),
  approved: z.boolean(),
});

export const stopAgentActionSchema = z.object({
  type: z.literal('stop_agent'),
});

export const actionSchema = z.discriminatedUnion('type', [
  answerQuestionActionSchema,
  approvePlanActionSchema,
  stopAgentActionSchema,
]);
