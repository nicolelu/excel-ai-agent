/**
 * Chat Route - Handles LLM conversations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { chatService } from '../services/chatService';
import { ChatRequest, ToolResult } from '@excel-ai-agent/shared';

export const chatRouter = Router();

// Request validation schemas
const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number(),
});

const workbookSchemaSchema = z.object({
  name: z.string(),
  sheets: z.array(z.object({
    name: z.string(),
    usedRange: z.string().optional(),
    tables: z.array(z.object({
      name: z.string(),
      address: z.string(),
      headerRow: z.array(z.string()),
      rowCount: z.number(),
    })),
    charts: z.array(z.object({
      name: z.string(),
      type: z.string(),
      dataRange: z.string().optional(),
    })),
    pivotTables: z.array(z.object({
      name: z.string(),
      sourceRange: z.string().optional(),
    })),
  })),
  namedRanges: z.array(z.object({
    name: z.string(),
    address: z.string(),
    sheetName: z.string(),
  })),
  activeSheet: z.string(),
  activeSelection: z.string().optional(),
});

const selectionContextSchema = z.object({
  address: z.string(),
  sheetName: z.string(),
  values: z.array(z.array(z.unknown())).optional(),
}).optional();

const planStepSchema = z.object({
  id: z.string(),
  description: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
  expectedEffect: z.string(),
  riskLevel: z.enum(['read', 'write', 'destructive']),
  preconditions: z.array(z.string()),
  postconditions: z.array(z.string()),
});

const executionPlanSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  description: z.string(),
  steps: z.array(planStepSchema),
  estimatedTokens: z.number().optional(),
  estimatedCost: z.number().optional(),
}).optional();

const chatRequestSchema = z.object({
  modelId: z.string(),
  messages: z.array(chatMessageSchema),
  workbookSchema: workbookSchemaSchema,
  selectionContext: selectionContextSchema,
  mode: z.enum(['plan', 'apply']),
  planToApply: executionPlanSchema,
  contextScope: z.enum(['selection', 'sheet', 'table', 'workbook']).optional(),
});

const toolResultSchema = z.object({
  callId: z.string(),
  result: z.object({
    success: z.boolean(),
    data: z.unknown().optional(),
    error: z.string().optional(),
    artifactId: z.string().optional(),
  }),
});

const continueRequestSchema = z.object({
  modelId: z.string(),
  messages: z.array(chatMessageSchema),
  workbookSchema: workbookSchemaSchema,
  selectionContext: selectionContextSchema,
  mode: z.enum(['plan', 'apply']),
  contextScope: z.enum(['selection', 'sheet', 'table', 'workbook']).optional(),
  toolResults: z.array(toolResultSchema),
});

/**
 * POST /chat
 * Main chat endpoint for LLM conversations
 */
chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    const parseResult = chatRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.errors,
      });
    }

    const chatRequest: ChatRequest = parseResult.data as ChatRequest;
    const result = await chatService.processChat(chatRequest);

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
      });
    }

    return res.json({
      success: true,
      response: result.response,
      plan: result.plan,
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /chat/continue
 * Continue a conversation after tool execution
 */
chatRouter.post('/continue', async (req: Request, res: Response) => {
  try {
    const parseResult = continueRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.errors,
      });
    }

    const { toolResults, ...chatRequest } = parseResult.data;
    const result = await chatService.continueWithToolResults(
      chatRequest as ChatRequest,
      toolResults as { callId: string; result: ToolResult }[]
    );

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
      });
    }

    return res.json({
      success: true,
      response: result.response,
      plan: result.plan,
    });
  } catch (error) {
    console.error('Chat continue endpoint error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
