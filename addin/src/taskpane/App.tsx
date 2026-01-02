import React, { useState, useEffect, useCallback } from 'react';
import {
  Spinner,
  Toast,
  ToastTitle,
  Toaster,
  useToastController,
  useId,
} from '@fluentui/react-components';
import { ChatInterface } from '../components/ChatInterface';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useModels } from '../hooks/useModels';
import { useChat } from '../hooks/useChat';
import { useWorkbookSchema } from '../hooks/useWorkbookSchema';
import { storageService } from '../services/storageService';
import type { ContextScope } from '@shared/types';

const App: React.FC = () => {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [contextScope, setContextScope] = useState<ContextScope>('workbook');
  const [isInitialized, setIsInitialized] = useState(false);

  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);

  const {
    models,
    defaultModelId,
    loading: modelsLoading,
    error: modelsError,
    refresh: refreshModels,
  } = useModels();

  const {
    schema,
    selectionContext,
    refresh: refreshSchema,
  } = useWorkbookSchema();

  const {
    messages,
    currentPlan,
    isLoading: chatLoading,
    error: chatError,
    sendMessage,
    approvePlan,
    cancelPlan,
    clearMessages,
  } = useChat(selectedModelId, schema, selectionContext, contextScope);

  // Load persisted model selection
  useEffect(() => {
    const loadPersistedModel = async () => {
      try {
        const persistedModelId = await storageService.getSelectedModel();
        if (persistedModelId) {
          setSelectedModelId(persistedModelId);
        }
      } catch (e) {
        console.error('Failed to load persisted model:', e);
      }
      setIsInitialized(true);
    };

    loadPersistedModel();
  }, []);

  // Set default model if none selected
  useEffect(() => {
    if (isInitialized && !selectedModelId && defaultModelId) {
      setSelectedModelId(defaultModelId);
    }
  }, [isInitialized, selectedModelId, defaultModelId]);

  // Validate selected model exists
  useEffect(() => {
    if (isInitialized && selectedModelId && models.length > 0) {
      const modelExists = models.some(m => m.id === selectedModelId);
      if (!modelExists && defaultModelId) {
        setSelectedModelId(defaultModelId);
        dispatchToast(
          <Toast>
            <ToastTitle>Model no longer available, switched to default</ToastTitle>
          </Toast>,
          { intent: 'warning' }
        );
      }
    }
  }, [isInitialized, selectedModelId, models, defaultModelId, dispatchToast]);

  // Handle model selection
  const handleModelChange = useCallback(async (modelId: string) => {
    setSelectedModelId(modelId);
    try {
      await storageService.setSelectedModel(modelId);
    } catch (e) {
      console.error('Failed to persist model selection:', e);
    }
  }, []);

  // Show error toast
  useEffect(() => {
    if (modelsError) {
      dispatchToast(
        <Toast>
          <ToastTitle>{modelsError}</ToastTitle>
        </Toast>,
        { intent: 'error' }
      );
    }
  }, [modelsError, dispatchToast]);

  useEffect(() => {
    if (chatError) {
      dispatchToast(
        <Toast>
          <ToastTitle>{chatError}</ToastTitle>
        </Toast>,
        { intent: 'error' }
      );
    }
  }, [chatError, dispatchToast]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: string) => {
    const templatePrompts: Record<string, string> = {
      chart: 'Create a chart of the data in the current selection',
      pivot: 'Create a pivot table from the data in the current sheet',
      financial: 'Create a 3-statement financial model with Income Statement, Balance Sheet, and Cash Flow sheets',
      cube: 'Create a PE customer cube with normalized data and pivot views',
    };

    const prompt = templatePrompts[template];
    if (prompt) {
      sendMessage(prompt);
    }
  }, [sendMessage]);

  // Show loading state
  if (!isInitialized || modelsLoading) {
    return (
      <div className="app-container">
        <div className="loading-indicator">
          <Spinner size="medium" label="Loading..." />
        </div>
      </div>
    );
  }

  // Show error state if no models
  if (models.length === 0 && !modelsLoading) {
    return (
      <div className="app-container">
        <Header
          models={[]}
          selectedModelId={null}
          onModelChange={handleModelChange}
          onRefreshModels={refreshModels}
        />
        <div className="error-message">
          No AI models available. Please check server configuration.
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Toaster toasterId={toasterId} />
        <Header
          models={models}
          selectedModelId={selectedModelId}
          onModelChange={handleModelChange}
          onRefreshModels={refreshModels}
        />

        {messages.length === 0 && !chatLoading ? (
          <EmptyState onTemplateSelect={handleTemplateSelect} />
        ) : (
          <ChatInterface
            messages={messages}
            currentPlan={currentPlan}
            isLoading={chatLoading}
            contextScope={contextScope}
            onContextScopeChange={setContextScope}
            onSendMessage={sendMessage}
            onApprovePlan={approvePlan}
            onCancelPlan={cancelPlan}
            onClearMessages={clearMessages}
            onRefreshSchema={refreshSchema}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
