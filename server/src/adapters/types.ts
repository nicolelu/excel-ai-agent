/**
 * LLM Provider Adapter Interface
 */

import { ChatMessage, ChatResponseChunk, ExecutionPlan, WorkbookSchema, SelectionContext, ContextScope } from '@excel-ai-agent/shared';
import { TOOL_DEFINITIONS } from '@excel-ai-agent/shared/types/tool';

export interface LLMProviderConfig {
  apiKey: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionRequest {
  messages: ProviderMessage[];
  tools?: ProviderTool[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ProviderToolCall[];
}

export interface ProviderTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ProviderToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionResponse {
  content?: string;
  toolCalls?: ProviderToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  readonly id: string;
  readonly supportsToolCalling: boolean;

  chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  streamChat?(request: ChatCompletionRequest): AsyncGenerator<ChatResponseChunk>;
}

/**
 * Converts our tool definitions to provider-specific format
 */
export function toolDefinitionsToProviderTools(): ProviderTool[] {
  return TOOL_DEFINITIONS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          tool.parameters.map(param => [
            param.name,
            {
              type: param.type === 'array' ? 'array' : param.type === 'object' ? 'object' : param.type,
              description: param.description,
              ...(param.default !== undefined && { default: param.default }),
            },
          ])
        ),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
    },
  }));
}

/**
 * Build system prompt for the assistant
 */
export function buildSystemPrompt(
  mode: 'plan' | 'apply',
  workbookSchema: WorkbookSchema,
  selectionContext?: SelectionContext,
  contextScope?: ContextScope
): string {
  const scopeDescription = contextScope === 'selection'
    ? 'Only the selected range is in scope.'
    : contextScope === 'sheet'
      ? 'Only the current sheet is in scope.'
      : contextScope === 'table'
        ? 'Only the specified table is in scope.'
        : 'The entire workbook is in scope.';

  const basePrompt = `You are an Excel AI Assistant that helps users with spreadsheet tasks.
You operate by calling deterministic tools to read and modify Excel workbooks.

Current Workbook Context:
${JSON.stringify(workbookSchema, null, 2)}

${selectionContext ? `Selected Range: ${selectionContext.address} on sheet "${selectionContext.sheetName}"
${selectionContext.values ? `Selected Values Preview: ${JSON.stringify(selectionContext.values.slice(0, 5))}` : ''}` : ''}

Scope: ${scopeDescription}

CRITICAL RULES:
1. NEVER generate raw Office.js code or any JavaScript/TypeScript code.
2. ONLY use the provided tools to interact with Excel.
3. Always validate that required sheets/tables exist before operating on them.
4. When creating new artifacts (sheets, charts, pivots), use unique names to avoid collisions.
5. If a name collision is detected, append a suffix like " (2)" or use a timestamp.

Available Tools:
${TOOL_DEFINITIONS.map(t => `- ${t.name}: ${t.description}`).join('\n')}
`;

  if (mode === 'plan') {
    return basePrompt + `
PLANNING MODE:
You are in PLANNING mode. Your task is to:
1. Analyze the user's request.
2. Determine which tools need to be called and in what order.
3. Return a structured execution plan with steps.

Each step must include:
- id: A unique step identifier (e.g., "step_1")
- description: What this step does
- toolName: The tool to call
- args: Arguments for the tool
- expectedEffect: What changes this will make
- riskLevel: "read", "write", or "destructive"
- preconditions: What must be true before this step
- postconditions: What will be true after this step

DO NOT execute any tools that modify the workbook in planning mode.
Only call read tools (getWorkbookSchema, getRangeValues) if needed to gather information.

Return the plan in this exact JSON format:
{
  "plan": {
    "id": "plan_<uuid>",
    "description": "<overall task description>",
    "steps": [<array of steps>],
    "estimatedTokens": <number>,
    "estimatedCost": <number in USD>
  }
}`;
  } else {
    return basePrompt + `
APPLY MODE:
You are in APPLY mode. Execute the plan step by step.
Call tools as needed and provide progress updates.
After all steps complete, provide a summary of changes made.`;
  }
}
