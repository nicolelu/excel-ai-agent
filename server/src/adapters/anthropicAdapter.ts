/**
 * Anthropic Provider Adapter
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  LLMProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderMessage,
} from './types';
import { ChatResponseChunk } from '@excel-ai-agent/shared';

export class AnthropicAdapter implements LLMProvider {
  readonly id = 'anthropic';
  readonly supportsToolCalling = true;

  private client: Anthropic;
  private modelId: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: LLMProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.modelId = config.modelId;
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 4096;
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const { systemPrompt, messages } = this.convertMessages(request.messages);

    const response = await this.client.messages.create({
      model: this.modelId,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
      system: systemPrompt,
      messages,
      tools: request.tools?.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters as Anthropic.Tool['input_schema'],
      })),
      temperature: request.temperature ?? this.defaultTemperature,
    });

    // Extract text content and tool uses
    let textContent = '';
    const toolCalls: ChatCompletionResponse['toolCalls'] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input),
          },
        });
      }
    }

    return {
      content: textContent || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: this.mapStopReason(response.stop_reason),
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async *streamChat(request: ChatCompletionRequest): AsyncGenerator<ChatResponseChunk> {
    const { systemPrompt, messages } = this.convertMessages(request.messages);

    const stream = await this.client.messages.stream({
      model: this.modelId,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
      system: systemPrompt,
      messages,
      tools: request.tools?.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters as Anthropic.Tool['input_schema'],
      })),
      temperature: request.temperature ?? this.defaultTemperature,
    });

    let currentToolUse: { id: string; name: string; input: string } | null = null;

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          currentToolUse = {
            id: event.content_block.id,
            name: event.content_block.name,
            input: '',
          };
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield { type: 'text', content: event.delta.text };
        } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
          currentToolUse.input += event.delta.partial_json;
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolUse) {
          try {
            const args = JSON.parse(currentToolUse.input);
            yield {
              type: 'tool_call',
              callId: currentToolUse.id,
              toolName: currentToolUse.name as never,
              args,
            };
          } catch (e) {
            yield {
              type: 'error',
              error: `Failed to parse tool input: ${e}`,
              recoverable: true,
            };
          }
          currentToolUse = null;
        }
      }
    }
  }

  private convertMessages(messages: ProviderMessage[]): {
    systemPrompt: string;
    messages: Anthropic.MessageParam[];
  } {
    let systemPrompt = '';
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
        continue;
      }

      if (msg.role === 'user') {
        anthropicMessages.push({
          role: 'user',
          content: msg.content,
        });
      } else if (msg.role === 'assistant') {
        const content: Array<Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam> = [];

        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }

        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.function.name,
              input: JSON.parse(tc.function.arguments),
            });
          }
        }

        anthropicMessages.push({
          role: 'assistant',
          content,
        });
      } else if (msg.role === 'tool') {
        anthropicMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId!,
              content: msg.content,
            },
          ],
        });
      }
    }

    return { systemPrompt, messages: anthropicMessages };
  }

  private mapStopReason(reason: string | null): ChatCompletionResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'tool_use':
        return 'tool_calls';
      case 'max_tokens':
        return 'length';
      default:
        return 'stop';
    }
  }
}

export function createAnthropicAdapter(modelId: string): AnthropicAdapter | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new AnthropicAdapter({
    apiKey,
    modelId,
  });
}
