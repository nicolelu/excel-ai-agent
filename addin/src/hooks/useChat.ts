import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { apiService } from '../services/apiService';
import { excelTools } from '../tools';
import { ledgerService } from '../services/ledgerService';
import type {
  ChatMessage,
  ExecutionPlan,
  WorkbookSchema,
  SelectionContext,
  ContextScope,
  ChatResponseChunk,
  ToolResult,
  ToolName,
} from '@shared/types';

interface UseChatResult {
  messages: ChatMessage[];
  currentPlan: ExecutionPlan | null;
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  approvePlan: () => Promise<void>;
  cancelPlan: () => void;
  clearMessages: () => void;
}

export function useChat(
  modelId: string | null,
  schema: WorkbookSchema | null,
  selectionContext: SelectionContext | null,
  contextScope: ContextScope
): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ExecutionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMessage = useCallback((role: ChatMessage['role'], content: string, metadata?: ChatMessage['metadata']) => {
    const message: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: Date.now(),
      metadata,
    };
    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  const processResponse = useCallback(async (
    chunks: ChatResponseChunk[],
    modelId: string,
    existingMessages: ChatMessage[]
  ): Promise<void> => {
    const toolResults: { callId: string; result: ToolResult }[] = [];
    let textContent = '';
    let plan: ExecutionPlan | null = null;

    for (const chunk of chunks) {
      switch (chunk.type) {
        case 'text':
          textContent += chunk.content;
          break;

        case 'plan':
          plan = chunk.plan;
          setCurrentPlan(plan);
          break;

        case 'tool_call':
          // Execute the tool
          const toolResult = await executeToolCall(chunk.toolName, chunk.args);
          toolResults.push({
            callId: chunk.callId,
            result: toolResult,
          });
          break;

        case 'final':
          if (chunk.message) {
            addMessage('assistant', chunk.message, {
              tokenUsage: chunk.tokenUsage,
            });
          }
          break;

        case 'error':
          setError(chunk.error);
          addMessage('system', `Error: ${chunk.error}`);
          break;
      }
    }

    // If we have text content but no final message, add it
    if (textContent && !chunks.some(c => c.type === 'final')) {
      addMessage('assistant', textContent);
    }

    // If we executed tools, continue the conversation
    if (toolResults.length > 0 && schema) {
      const continueResponse = await apiService.continueChat({
        modelId,
        messages: existingMessages,
        workbookSchema: schema,
        selectionContext: selectionContext ?? undefined,
        mode: 'plan',
        contextScope,
      }, toolResults);

      if (continueResponse.success && continueResponse.response) {
        await processResponse(continueResponse.response, modelId, existingMessages);
      }
    }
  }, [addMessage, schema, selectionContext, contextScope]);

  const executeToolCall = async (toolName: ToolName, args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      // Check ledger for idempotency
      if (['createSheet', 'createChart', 'createPivotTable', 'ensureTable'].includes(toolName)) {
        const fingerprint = await ledgerService.getWorkbookFingerprint();
        const existing = await ledgerService.findEntry({
          workbookFingerprint: fingerprint.computed,
          actionType: toolName as 'createSheet' | 'createChart' | 'createPivotTable',
          normalizedArgs: JSON.stringify(args),
        });

        if (existing && existing.verified) {
          return {
            success: true,
            data: { alreadyExists: true, artifactId: existing.entry?.artifactId },
            artifactId: existing.entry?.artifactId,
          };
        }
      }

      // Execute the tool
      const toolFn = (excelTools as unknown as Record<string, (args: unknown) => Promise<ToolResult>>)[toolName];
      const result = await toolFn(args);

      // Record in ledger if successful
      if (result.success && result.artifactId) {
        const fingerprint = await ledgerService.getWorkbookFingerprint();
        await ledgerService.recordEntry({
          workbookFingerprint: fingerprint.computed,
          actionType: toolName as 'createSheet' | 'createChart' | 'createPivotTable',
          normalizedArgs: JSON.stringify(args),
          artifactId: result.artifactId,
          artifactName: (args as { name?: string }).name || result.artifactId,
        });
      }

      return result;
    } catch (e) {
      console.error(`Tool execution failed: ${toolName}`, e);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Tool execution failed',
      };
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!modelId || !schema) {
      setError('Please select a model and ensure workbook is loaded');
      return;
    }

    setIsLoading(true);
    setError(null);

    const userMessage = addMessage('user', content);
    const allMessages = [...messages, userMessage];

    try {
      const response = await apiService.chat({
        modelId,
        messages: allMessages,
        workbookSchema: schema,
        selectionContext: selectionContext ?? undefined,
        mode: 'plan',
        contextScope,
      });

      if (!response.success) {
        throw new Error(response.error || 'Chat request failed');
      }

      if (response.response) {
        await processResponse(response.response, modelId, allMessages);
      }

      if (response.plan) {
        setCurrentPlan(response.plan);
      }
    } catch (e) {
      console.error('Failed to send message:', e);
      const errorMsg = e instanceof Error ? e.message : 'Failed to send message';
      setError(errorMsg);
      addMessage('system', `Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }, [modelId, schema, selectionContext, contextScope, messages, addMessage, processResponse]);

  const approvePlan = useCallback(async () => {
    if (!currentPlan || !modelId || !schema) return;

    setIsLoading(true);
    setError(null);

    try {
      const changes: string[] = [];

      for (const step of currentPlan.steps) {
        addMessage('system', `Executing: ${step.description}`);

        const result = await executeToolCall(step.toolName, step.args);

        if (!result.success) {
          throw new Error(`Step failed: ${step.description} - ${result.error}`);
        }

        changes.push(step.description);
      }

      addMessage('assistant', `Plan executed successfully!\n\nChanges made:\n${changes.map(c => `• ${c}`).join('\n')}`);
      setCurrentPlan(null);
    } catch (e) {
      console.error('Plan execution failed:', e);
      const errorMsg = e instanceof Error ? e.message : 'Plan execution failed';
      setError(errorMsg);
      addMessage('system', `Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  }, [currentPlan, modelId, schema, addMessage]);

  const cancelPlan = useCallback(() => {
    setCurrentPlan(null);
    addMessage('system', 'Plan cancelled');
  }, [addMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentPlan(null);
    setError(null);
  }, []);

  return {
    messages,
    currentPlan,
    isLoading,
    error,
    sendMessage,
    approvePlan,
    cancelPlan,
    clearMessages,
  };
}
