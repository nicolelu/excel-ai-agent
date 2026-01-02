/**
 * Google Generative AI Provider Adapter
 */

import {
  GoogleGenerativeAI,
  Content,
  Part,
  FunctionCallingMode,
  Tool as GoogleTool,
} from '@google/generative-ai';
import {
  LLMProvider,
  LLMProviderConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ProviderMessage,
} from './types';
import { ChatResponseChunk } from '@excel-ai-agent/shared';

export class GoogleAdapter implements LLMProvider {
  readonly id = 'google';
  readonly supportsToolCalling = true;

  private client: GoogleGenerativeAI;
  private modelId: string;
  private defaultTemperature: number;

  constructor(config: LLMProviderConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.modelId = config.modelId;
    this.defaultTemperature = config.temperature ?? 0.7;
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const { systemInstruction, contents } = this.convertMessages(request.messages);

    // Don't limit output tokens - let the model complete its response fully
    const model = this.client.getGenerativeModel({
      model: this.modelId,
      systemInstruction,
      generationConfig: {
        temperature: request.temperature ?? this.defaultTemperature,
      },
      tools: request.tools ? this.convertTools(request.tools) : undefined,
      toolConfig: request.tools
        ? { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
        : undefined,
    });

    const result = await model.generateContent({ contents });
    const response = result.response;
    const candidate = response.candidates?.[0];

    if (!candidate) {
      return {
        finishReason: 'error',
      };
    }

    // Extract text and function calls
    let textContent = '';
    const toolCalls: ChatCompletionResponse['toolCalls'] = [];

    for (const part of candidate.content.parts) {
      if ('text' in part) {
        textContent += part.text;
      } else if ('functionCall' in part && part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args),
          },
        });
      }
    }

    const usageMetadata = response.usageMetadata;

    return {
      content: textContent || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: this.mapFinishReason(candidate.finishReason),
      usage: usageMetadata
        ? {
            promptTokens: usageMetadata.promptTokenCount ?? 0,
            completionTokens: usageMetadata.candidatesTokenCount ?? 0,
            totalTokens: usageMetadata.totalTokenCount ?? 0,
          }
        : undefined,
    };
  }

  async *streamChat(request: ChatCompletionRequest): AsyncGenerator<ChatResponseChunk> {
    const { systemInstruction, contents } = this.convertMessages(request.messages);

    // Don't limit output tokens - let the model complete its response fully
    const model = this.client.getGenerativeModel({
      model: this.modelId,
      systemInstruction,
      generationConfig: {
        temperature: request.temperature ?? this.defaultTemperature,
      },
      tools: request.tools ? this.convertTools(request.tools) : undefined,
      toolConfig: request.tools
        ? { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
        : undefined,
    });

    const result = await model.generateContentStream({ contents });

    for await (const chunk of result.stream) {
      const candidate = chunk.candidates?.[0];
      if (!candidate) continue;

      for (const part of candidate.content.parts) {
        if ('text' in part && part.text) {
          yield { type: 'text', content: part.text };
        } else if ('functionCall' in part && part.functionCall) {
          yield {
            type: 'tool_call',
            callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            toolName: part.functionCall.name as never,
            args: part.functionCall.args as Record<string, unknown>,
          };
        }
      }
    }
  }

  private convertMessages(messages: ProviderMessage[]): {
    systemInstruction: string;
    contents: Content[];
  } {
    let systemInstruction = '';
    const contents: Content[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
        continue;
      }

      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }],
        });
      } else if (msg.role === 'assistant') {
        const parts: Part[] = [];

        if (msg.content) {
          parts.push({ text: msg.content });
        }

        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            parts.push({
              functionCall: {
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments),
              },
            });
          }
        }

        contents.push({
          role: 'model',
          parts,
        });
      } else if (msg.role === 'tool') {
        // Function response
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: msg.name!,
                response: JSON.parse(msg.content),
              },
            },
          ],
        });
      }
    }

    return { systemInstruction, contents };
  }

  private convertTools(tools: ChatCompletionRequest['tools']): GoogleTool[] {
    if (!tools) return [];

    return [
      {
        functionDeclarations: tools.map(t => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters as never,
        })),
      },
    ];
  }

  private mapFinishReason(reason?: string): ChatCompletionResponse['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
      case 'OTHER':
        return 'error';
      default:
        return 'stop';
    }
  }
}

export function createGoogleAdapter(modelId: string): GoogleAdapter | null {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return null;
  }

  return new GoogleAdapter({
    apiKey,
    modelId,
  });
}
