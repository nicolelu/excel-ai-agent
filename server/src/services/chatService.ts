/**
 * Chat Service - Handles LLM conversations with tool calling
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ChatRequest,
  ChatResponseChunk,
  ExecutionPlan,
  PlanStep,
  ToolResult,
} from '@excel-ai-agent/shared';
import { TOOL_DEFINITIONS, ToolName } from '@excel-ai-agent/shared/types/tool';
import { modelService } from './modelService';
import {
  createProviderAdapter,
  LLMProvider,
  ProviderMessage,
  toolDefinitionsToProviderTools,
  buildSystemPrompt,
  ChatCompletionResponse,
} from '../adapters';

export interface ChatServiceResult {
  success: boolean;
  response?: ChatResponseChunk[];
  plan?: ExecutionPlan;
  error?: string;
}

class ChatService {
  /**
   * Process a chat request and return response chunks
   */
  async processChat(request: ChatRequest): Promise<ChatServiceResult> {
    // Get the model
    const model = modelService.getModelById(request.modelId);
    if (!model) {
      return {
        success: false,
        error: `Model not found or not enabled: ${request.modelId}`,
      };
    }

    // Create provider adapter
    const adapter = createProviderAdapter(model);
    if (!adapter) {
      return {
        success: false,
        error: `Failed to create provider adapter for ${model.provider}. Check API key configuration.`,
      };
    }

    try {
      if (request.mode === 'plan') {
        return await this.processPlanMode(adapter, request);
      } else {
        return await this.processApplyMode(adapter, request);
      }
    } catch (error) {
      console.error('Chat processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async processPlanMode(
    adapter: LLMProvider,
    request: ChatRequest
  ): Promise<ChatServiceResult> {
    const systemPrompt = buildSystemPrompt(
      'plan',
      request.workbookSchema,
      request.selectionContext,
      request.contextScope
    );

    const messages: ProviderMessage[] = [
      { role: 'system', content: systemPrompt },
      ...request.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const tools = toolDefinitionsToProviderTools();
    const chunks: ChatResponseChunk[] = [];

    // Initial completion to get the plan
    const response = await adapter.chat({
      messages,
      tools,
      temperature: 0.7,
    });

    if (response.content) {
      // Try to parse the plan from the response
      const plan = this.extractPlanFromResponse(response.content);
      if (plan) {
        chunks.push({ type: 'plan', plan });
        chunks.push({
          type: 'final',
          message: 'Plan generated successfully. Review and approve to apply.',
          summaryOfChanges: plan.steps.map(s => s.description),
          tokenUsage: response.usage
            ? {
                promptTokens: response.usage.promptTokens,
                completionTokens: response.usage.completionTokens,
                totalTokens: response.usage.totalTokens,
                estimatedCost: this.estimateCost(response.usage.totalTokens),
              }
            : undefined,
        });

        return { success: true, response: chunks, plan };
      }
    }

    // If the model wants to call tools to gather information first
    if (response.toolCalls && response.toolCalls.length > 0) {
      // In plan mode, we only allow read tools
      const readTools = response.toolCalls.filter(tc => {
        const toolDef = TOOL_DEFINITIONS.find(t => t.name === tc.function.name);
        return toolDef?.riskLevel === 'read';
      });

      for (const toolCall of readTools) {
        chunks.push({
          type: 'tool_call',
          callId: toolCall.id,
          toolName: toolCall.function.name as ToolName,
          args: JSON.parse(toolCall.function.arguments),
        });
      }

      // Return tool calls for client to execute
      return { success: true, response: chunks };
    }

    // If we got text but no plan, include it as a message
    if (response.content) {
      chunks.push({ type: 'text', content: response.content });
    }

    return { success: true, response: chunks };
  }

  private async processApplyMode(
    adapter: LLMProvider,
    request: ChatRequest
  ): Promise<ChatServiceResult> {
    // If we have a plan to apply, execute it step by step
    if (request.planToApply) {
      return this.executePlan(adapter, request);
    }

    // Otherwise, this is a direct apply (simple operations)
    const systemPrompt = buildSystemPrompt(
      'apply',
      request.workbookSchema,
      request.selectionContext,
      request.contextScope
    );

    const messages: ProviderMessage[] = [
      { role: 'system', content: systemPrompt },
      ...request.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const tools = toolDefinitionsToProviderTools();
    const chunks: ChatResponseChunk[] = [];

    const response = await adapter.chat({
      messages,
      tools,
      temperature: 0.7,
    });

    if (response.content) {
      chunks.push({ type: 'text', content: response.content });
    }

    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        chunks.push({
          type: 'tool_call',
          callId: toolCall.id,
          toolName: toolCall.function.name as ToolName,
          args: JSON.parse(toolCall.function.arguments),
        });
      }
    }

    return { success: true, response: chunks };
  }

  private async executePlan(
    adapter: LLMProvider,
    request: ChatRequest
  ): Promise<ChatServiceResult> {
    const plan = request.planToApply!;
    const chunks: ChatResponseChunk[] = [];

    for (const step of plan.steps) {
      chunks.push({
        type: 'step_progress',
        stepId: step.id,
        status: 'started',
      });

      // Emit the tool call for this step
      chunks.push({
        type: 'tool_call',
        callId: `${plan.id}_${step.id}`,
        toolName: step.toolName,
        args: step.args,
      });
    }

    return { success: true, response: chunks };
  }

  /**
   * Continue a conversation after receiving tool results
   */
  async continueWithToolResults(
    request: ChatRequest,
    toolResults: { callId: string; result: ToolResult }[]
  ): Promise<ChatServiceResult> {
    const model = modelService.getModelById(request.modelId);
    if (!model) {
      return {
        success: false,
        error: `Model not found: ${request.modelId}`,
      };
    }

    const adapter = createProviderAdapter(model);
    if (!adapter) {
      return {
        success: false,
        error: `Failed to create provider adapter for ${model.provider}`,
      };
    }

    const systemPrompt = buildSystemPrompt(
      request.mode,
      request.workbookSchema,
      request.selectionContext,
      request.contextScope
    );

    // Build messages including tool results
    const messages: ProviderMessage[] = [
      { role: 'system', content: systemPrompt },
      ...request.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Add tool results as tool messages
    for (const tr of toolResults) {
      messages.push({
        role: 'tool',
        content: JSON.stringify(tr.result),
        toolCallId: tr.callId,
      });
    }

    const tools = toolDefinitionsToProviderTools();
    const chunks: ChatResponseChunk[] = [];

    const response = await adapter.chat({
      messages,
      tools,
      temperature: 0.7,
    });

    if (response.content) {
      // Check if this is a plan response
      if (request.mode === 'plan') {
        const plan = this.extractPlanFromResponse(response.content);
        if (plan) {
          chunks.push({ type: 'plan', plan });
          chunks.push({
            type: 'final',
            message: 'Plan generated successfully.',
            summaryOfChanges: plan.steps.map(s => s.description),
            tokenUsage: response.usage
              ? {
                  promptTokens: response.usage.promptTokens,
                  completionTokens: response.usage.completionTokens,
                  totalTokens: response.usage.totalTokens,
                  estimatedCost: this.estimateCost(response.usage.totalTokens),
                }
              : undefined,
          });
          return { success: true, response: chunks, plan };
        }
      }

      chunks.push({ type: 'text', content: response.content });
    }

    if (response.toolCalls) {
      for (const toolCall of response.toolCalls) {
        chunks.push({
          type: 'tool_call',
          callId: toolCall.id,
          toolName: toolCall.function.name as ToolName,
          args: JSON.parse(toolCall.function.arguments),
        });
      }
    }

    if (response.finishReason === 'stop' && !response.toolCalls) {
      chunks.push({
        type: 'final',
        message: response.content || 'Task completed.',
        summaryOfChanges: [],
        tokenUsage: response.usage
          ? {
              promptTokens: response.usage.promptTokens,
              completionTokens: response.usage.completionTokens,
              totalTokens: response.usage.totalTokens,
              estimatedCost: this.estimateCost(response.usage.totalTokens),
            }
          : undefined,
      });
    }

    return { success: true, response: chunks };
  }

  private extractPlanFromResponse(content: string): ExecutionPlan | null {
    console.log('[ChatService] Attempting to extract plan from response, length:', content.length);

    try {
      // Try multiple strategies to find the plan JSON
      let parsed: { plan?: { id?: string; description?: string; steps?: Partial<PlanStep>[] } } | null = null;

      // Strategy 1: Try to parse the entire content as JSON
      try {
        parsed = JSON.parse(content.trim());
        console.log('[ChatService] Strategy 1 (direct parse) succeeded');
      } catch {
        // Continue to next strategy
      }

      // Strategy 2: Look for JSON code block (with or without closing ```)
      if (!parsed) {
        // Match code block with optional closing
        const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)(?:```|$)/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          const jsonContent = codeBlockMatch[1].trim();
          console.log('[ChatService] Strategy 2 found code block, attempting parse');
          try {
            parsed = JSON.parse(jsonContent);
            console.log('[ChatService] Strategy 2 (code block) succeeded');
          } catch (e) {
            console.log('[ChatService] Strategy 2 parse failed:', (e as Error).message);
            // Try to extract just the JSON object from the code block
            const jsonMatch = jsonContent.match(/(\{[\s\S]*\})\s*$/);
            if (jsonMatch) {
              try {
                parsed = JSON.parse(jsonMatch[1]);
                console.log('[ChatService] Strategy 2b (code block + regex) succeeded');
              } catch {
                // Continue
              }
            }
          }
        }
      }

      // Strategy 3: Find JSON object with "plan" key using balanced brace matching
      if (!parsed) {
        // Look for { "plan" or {"plan"
        const planStartMatch = content.match(/\{\s*"plan"/);
        if (planStartMatch && planStartMatch.index !== undefined) {
          const planStart = planStartMatch.index;
          console.log('[ChatService] Strategy 3 found plan start at index:', planStart);
          // Find matching closing brace
          let braceCount = 0;
          let endIndex = planStart;
          for (let i = planStart; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            if (content[i] === '}') braceCount--;
            if (braceCount === 0) {
              endIndex = i + 1;
              break;
            }
          }
          const jsonStr = content.slice(planStart, endIndex);
          try {
            parsed = JSON.parse(jsonStr);
            console.log('[ChatService] Strategy 3 (balanced braces) succeeded');
          } catch (e) {
            console.log('[ChatService] Strategy 3 parse failed:', (e as Error).message);
          }
        }
      }

      // Validate we have a plan with steps
      if (parsed?.plan && Array.isArray(parsed.plan.steps) && parsed.plan.steps.length > 0) {
        const plan: ExecutionPlan = {
          id: parsed.plan.id || `plan_${uuidv4()}`,
          createdAt: Date.now(),
          description: parsed.plan.description || 'Generated plan',
          steps: parsed.plan.steps.map((step: Partial<PlanStep>, index: number) => ({
            id: step.id || `step_${index + 1}`,
            description: step.description || 'Unnamed step',
            toolName: step.toolName as ToolName,
            args: step.args || {},
            expectedEffect: step.expectedEffect || '',
            riskLevel: step.riskLevel || 'write',
            preconditions: step.preconditions || [],
            postconditions: step.postconditions || [],
          })),
          estimatedTokens: parsed.plan.estimatedTokens,
          estimatedCost: parsed.plan.estimatedCost,
        };

        // Validate tool names
        for (const step of plan.steps) {
          const toolDef = TOOL_DEFINITIONS.find(t => t.name === step.toolName);
          if (!toolDef) {
            console.warn(`[ChatService] Unknown tool in plan: ${step.toolName}`);
          }
        }

        console.log(`[ChatService] Successfully extracted plan with ${plan.steps.length} steps`);
        return plan;
      }

      console.log('[ChatService] No valid plan structure found. Parsed object:', parsed ? 'exists but invalid' : 'null');
      return null;
    } catch (e) {
      console.error('[ChatService] Failed to parse plan from response:', e);
      return null;
    }
  }

  private estimateCost(tokens: number): number {
    // Rough estimate based on GPT-4 pricing
    // $0.03 per 1K input tokens, $0.06 per 1K output tokens
    // Using average of $0.045 per 1K tokens
    return (tokens / 1000) * 0.045;
  }
}

export const chatService = new ChatService();
