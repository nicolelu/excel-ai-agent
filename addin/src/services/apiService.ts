/**
 * API Service - Handles communication with the LLM gateway
 */

import type {
  ModelsResponse,
  ChatRequest,
  ChatResponseChunk,
  ExecutionPlan,
  ToolResult,
} from '@shared/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ChatApiResponse {
  success: boolean;
  response?: ChatResponseChunk[];
  plan?: ExecutionPlan;
  error?: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getModels(): Promise<ModelsResponse> {
    const response = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    return response.json();
  }

  async chat(request: ChatRequest): Promise<ChatApiResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Chat request failed: ${response.status}`);
    }

    return response.json();
  }

  async continueChat(
    request: ChatRequest,
    toolResults: { callId: string; result: ToolResult }[]
  ): Promise<ChatApiResponse> {
    const response = await fetch(`${this.baseUrl}/chat/continue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        toolResults,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Continue request failed: ${response.status}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService(API_URL);
