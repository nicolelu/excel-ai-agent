/**
 * OpenAI Provider Adapter
 */

import OpenAI from 'openai';
import {
  LLMProvider,
  LLMProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderMessage,
  ProviderTool,
} from './types';
import { ChatResponseChunk } from '@excel-ai-agent/shared';

export class OpenAIAdapter implements LLMProvider {
  readonly id = 'openai';
  readonly supportsToolCalling = true;

  private client: OpenAI;
  private modelId: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: LLMProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
    this.modelId = config.modelId;
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 16384;
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const messages = this.convertMessages(request.messages);

    const response = await this.client.chat.completions.create({
      model: this.modelId,
      messages,
      tools: request.tools?.map(t => ({
        type: 'function' as const,
        function: t.function,
      })),
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
    });

    const choice = response.choices[0];

    return {
      content: choice.message.content ?? undefined,
      toolCalls: choice.message.tool_calls?.map(tc => ({
        id: tc.id,
        type: 'function' as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
      finishReason: this.mapFinishReason(choice.finish_reason),
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *streamChat(request: ChatCompletionRequest): AsyncGenerator<ChatResponseChunk> {
    const messages = this.convertMessages(request.messages);

    const stream = await this.client.chat.completions.create({
      model: this.modelId,
      messages,
      tools: request.tools?.map(t => ({
        type: 'function' as const,
        function: t.function,
      })),
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
      stream: true,
    });

    let currentToolCalls: Map<number, { id: string; name: string; arguments: string }> = new Map();
    let textBuffer = '';

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        textBuffer += delta.content;
        yield { type: 'text', content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          const index = toolCallDelta.index;

          if (!currentToolCalls.has(index)) {
            currentToolCalls.set(index, {
              id: toolCallDelta.id ?? '',
              name: toolCallDelta.function?.name ?? '',
              arguments: '',
            });
          }

          const current = currentToolCalls.get(index)!;

          if (toolCallDelta.id) {
            current.id = toolCallDelta.id;
          }
          if (toolCallDelta.function?.name) {
            current.name = toolCallDelta.function.name;
          }
          if (toolCallDelta.function?.arguments) {
            current.arguments += toolCallDelta.function.arguments;
          }
        }
      }

      if (chunk.choices[0]?.finish_reason === 'tool_calls') {
        for (const [, toolCall] of currentToolCalls) {
          try {
            const args = JSON.parse(toolCall.arguments);
            yield {
              type: 'tool_call',
              callId: toolCall.id,
              toolName: toolCall.name as never,
              args,
            };
          } catch (e) {
            yield {
              type: 'error',
              error: `Failed to parse tool call arguments: ${e}`,
              recoverable: true,
            };
          }
        }
      }
    }
  }

  private convertMessages(messages: ProviderMessage[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId!,
        };
      }

      if (msg.role === 'assistant' && msg.toolCalls) {
        return {
          role: 'assistant' as const,
          content: msg.content || null,
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments,
            },
          })),
        };
      }

      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      };
    });
  }

  private mapFinishReason(reason: string | null): ChatCompletionResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'tool_calls':
        return 'tool_calls';
      case 'length':
        return 'length';
      default:
        return 'stop';
    }
  }
}

export function createOpenAIAdapter(modelId: string): OpenAIAdapter | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new OpenAIAdapter({
    apiKey,
    modelId,
  });
}
