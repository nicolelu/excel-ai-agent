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
            getParameterSchema(param.name, param.type, param.description, param.default),
          ])
        ),
        required: tool.parameters.filter(p => p.required).map(p => p.name),
      },
    },
  }));
}

/**
 * Get JSON Schema for a parameter, handling arrays and special cases
 */
function getParameterSchema(
  name: string,
  type: string,
  description: string,
  defaultValue?: unknown
): Record<string, unknown> {
  const base: Record<string, unknown> = { description };

  if (defaultValue !== undefined) {
    base.default = defaultValue;
  }

  if (type === 'array') {
    // Handle specific array parameters with proper items schema
    base.type = 'array';

    if (name === 'values') {
      // 2D array for writeRange
      base.items = {
        type: 'array',
        items: { type: 'string' },
        description: 'Row of values',
      };
    } else if (name === 'rows' || name === 'columns' || name === 'filters') {
      // String arrays for pivot table fields
      base.items = { type: 'string' };
    } else {
      // Default: array of objects (e.g., PivotValueField)
      base.items = {
        type: 'object',
        properties: {
          field: { type: 'string', description: 'Field name' },
          summarizeBy: {
            type: 'string',
            description: 'Aggregation function',
            enum: ['sum', 'count', 'average', 'max', 'min'],
          },
          name: { type: 'string', description: 'Display name' },
        },
        required: ['field'],
      };
    }
  } else if (type === 'object') {
    base.type = 'object';
    // For format objects, provide a basic schema
    if (name === 'format') {
      base.properties = {
        bold: { type: 'boolean', description: 'Bold text' },
        italic: { type: 'boolean', description: 'Italic text' },
        fontSize: { type: 'number', description: 'Font size in points' },
        fontColor: { type: 'string', description: 'Font color (hex)' },
        backgroundColor: { type: 'string', description: 'Background color (hex)' },
        numberFormat: { type: 'string', description: 'Number format string' },
        horizontalAlignment: { type: 'string', enum: ['left', 'center', 'right'] },
      };
    } else {
      base.additionalProperties = true;
    }
  } else {
    base.type = type;
  }

  return base;
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

  const basePrompt = `You are an expert Excel AI Assistant that helps users build professional spreadsheets.
You operate by calling deterministic tools to read and modify Excel workbooks.

IMPORTANT: You must be THOROUGH and COMPREHENSIVE. When a user asks for something, interpret their request fully:
- If they ask for a "financial model", include all the standard line items, formulas, and structure
- If they ask for a "chart", choose appropriate type, labels, and formatting
- If they ask for a "pivot table", select meaningful row/column/value fields
- NEVER just create empty shells - always populate with appropriate content, sample data, or formulas

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
5. BE COMPREHENSIVE - don't just create structure, populate it with meaningful content.
6. Use writeRange to add headers, labels, sample data, and placeholders.
7. Use setFormula to add calculations that link cells together.

Available Tools:
${TOOL_DEFINITIONS.map(t => `- ${t.name}: ${t.description}`).join('\n')}
`;

  if (mode === 'plan') {
    return basePrompt + `
PLANNING MODE:
You are in PLANNING mode. Your task is to:
1. Analyze the user's request COMPREHENSIVELY - interpret what they really need, not just literally.
2. Generate a COMPLETE plan that fully accomplishes the task.
3. Include ALL necessary steps: creating sheets, writing headers, adding data, setting formulas, formatting.

IMPORTANT GUIDELINES FOR COMPREHENSIVE PLANS:
- For a "3-statement financial model":
  * Create sheets: Assumptions, Income Statement, Balance Sheet, Cash Flow Statement
  * Populate each with standard line items (Revenue, COGS, Gross Profit, Operating Expenses, EBITDA, etc.)
  * Add formulas to calculate totals and link between statements
  * Include sample period columns (Year 1, Year 2, Year 3)

- For a "chart":
  * Analyze the data structure first
  * Choose appropriate chart type based on the data
  * Include proper title and formatting

- For "pivot table":
  * Analyze available columns
  * Choose meaningful row/column/value fields
  * Create on a new sheet with clear naming

Each step must include:
- id: A unique step identifier (e.g., "step_1")
- description: What this step does
- toolName: The tool to call
- args: Arguments for the tool (with ACTUAL values, not placeholders)
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
    "steps": [<array of steps with COMPLETE arguments including actual data to write>],
    "estimatedTokens": <number>,
    "estimatedCost": <number in USD>
  }
}

EXAMPLE for a 3-statement model - your plan should have 15-30 steps including:
1. createSheet for each statement
2. writeRange to add headers like [["Income Statement"], ["Year 1", "Year 2", "Year 3"]]
3. writeRange to add line items like [["Revenue"], ["Cost of Goods Sold"], ["Gross Profit"], ...]
4. setFormula to add calculations like "=B3-B4" for Gross Profit
5. formatRange to make headers bold

Be thorough! Users expect complete, professional output.`;
  } else {
    return basePrompt + `
APPLY MODE:
You are in APPLY mode. Execute the plan step by step.
Call tools as needed and provide progress updates.
After all steps complete, provide a summary of changes made.`;
  }
}
