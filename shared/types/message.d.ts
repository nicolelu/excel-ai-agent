/**
 * Chat message types and tool-calling protocol
 */
import { ExecutionPlan, PlanStepResult } from './plan';
import { WorkbookSchema, ToolResult, ToolName } from './tool';
export type MessageRole = 'user' | 'assistant' | 'system';
export interface ChatMessage {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: number;
    metadata?: MessageMetadata;
}
export interface MessageMetadata {
    toolCalls?: ToolCallInfo[];
    plan?: ExecutionPlan;
    stepResults?: PlanStepResult[];
    error?: string;
    tokenUsage?: TokenUsage;
}
export interface ToolCallInfo {
    callId: string;
    toolName: ToolName;
    args: Record<string, unknown>;
    result?: ToolResult;
    status: 'pending' | 'executing' | 'completed' | 'failed';
}
export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
}
export type ChatMode = 'plan' | 'apply';
export interface ChatRequest {
    modelId: string;
    messages: ChatMessage[];
    workbookSchema: WorkbookSchema;
    selectionContext?: SelectionContext;
    mode: ChatMode;
    planToApply?: ExecutionPlan;
    contextScope?: ContextScope;
}
export interface SelectionContext {
    address: string;
    sheetName: string;
    values?: unknown[][];
}
export type ContextScope = 'selection' | 'sheet' | 'table' | 'workbook';
export type ChatResponseChunk = TextChunk | ToolCallChunk | ToolResultChunk | PlanChunk | StepProgressChunk | FinalChunk | ErrorChunk;
export interface TextChunk {
    type: 'text';
    content: string;
}
export interface ToolCallChunk {
    type: 'tool_call';
    callId: string;
    toolName: ToolName;
    args: Record<string, unknown>;
}
export interface ToolResultChunk {
    type: 'tool_result';
    callId: string;
    result: ToolResult;
}
export interface PlanChunk {
    type: 'plan';
    plan: ExecutionPlan;
}
export interface StepProgressChunk {
    type: 'step_progress';
    stepId: string;
    status: 'started' | 'completed' | 'failed';
    result?: PlanStepResult;
}
export interface FinalChunk {
    type: 'final';
    message: string;
    summaryOfChanges: string[];
    tokenUsage?: TokenUsage;
}
export interface ErrorChunk {
    type: 'error';
    error: string;
    code?: string;
    recoverable: boolean;
}
//# sourceMappingURL=message.d.ts.map