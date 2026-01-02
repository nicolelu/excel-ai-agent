import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Textarea,
  Spinner,
  Dropdown,
  Option,
  Tooltip,
  Switch,
} from '@fluentui/react-components';
import {
  Send20Regular,
  Delete20Regular,
  ArrowSync20Regular,
  Bug20Regular,
} from '@fluentui/react-icons';
import { MessageBubble } from './MessageBubble';
import { PlanPreview } from './PlanPreview';
import type { ChatMessage, ExecutionPlan, ContextScope } from '@shared/types';


interface ChatInterfaceProps {
  messages: ChatMessage[];
  currentPlan: ExecutionPlan | null;
  isLoading: boolean;
  contextScope: ContextScope;
  onContextScopeChange: (scope: ContextScope) => void;
  onSendMessage: (message: string) => void;
  onApprovePlan: () => void;
  onCancelPlan: () => void;
  onClearMessages: () => void;
  onRefreshSchema: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  currentPlan,
  isLoading,
  contextScope,
  onContextScopeChange,
  onSendMessage,
  onApprovePlan,
  onCancelPlan,
  onClearMessages,
  onRefreshSchema,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [debugMode, setDebugMode] = useState(true); // Default to ON during development
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Log debug info when plan changes
  useEffect(() => {
    if (currentPlan && debugMode) {
      console.log('[DEBUG] Current Plan:', JSON.stringify(currentPlan, null, 2));
    }
  }, [currentPlan, debugMode]);

  // Log messages for debugging
  useEffect(() => {
    if (debugMode && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      console.log('[DEBUG] Last message:', lastMsg.role, lastMsg.content?.substring(0, 200));
    }
  }, [messages, debugMode]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !isLoading) {
      onSendMessage(trimmed);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const scopeOptions: { value: ContextScope; label: string }[] = [
    { value: 'selection', label: 'Selection Only' },
    { value: 'sheet', label: 'Current Sheet' },
    { value: 'table', label: 'Current Table' },
    { value: 'workbook', label: 'Entire Workbook' },
  ];

  return (
    <div className="chat-container">
      {/* Context scope selector */}
      <div className="context-scope-selector">
        <span style={{ color: '#666' }}>Scope:</span>
        <Dropdown
          size="small"
          value={scopeOptions.find(o => o.value === contextScope)?.label || ''}
          selectedOptions={[contextScope]}
          onOptionSelect={(_, data) => {
            if (data.optionValue) {
              onContextScopeChange(data.optionValue as ContextScope);
            }
          }}
          style={{ minWidth: '110px', maxWidth: '130px' }}
        >
          {scopeOptions.map((option) => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Dropdown>
        <Tooltip content="Refresh workbook context" relationship="label">
          <Button
            icon={<ArrowSync20Regular />}
            appearance="subtle"
            size="small"
            onClick={onRefreshSchema}
            aria-label="Refresh context"
          />
        </Tooltip>
        <div style={{ flex: 1 }} />
        <Tooltip content="Debug mode" relationship="label">
          <Switch
            checked={debugMode}
            onChange={(_, data) => setDebugMode(data.checked)}
            label={<Bug20Regular />}
          />
        </Tooltip>
        <Tooltip content="Clear conversation" relationship="label">
          <Button
            icon={<Delete20Regular />}
            appearance="subtle"
            size="small"
            onClick={onClearMessages}
            aria-label="Clear messages"
          />
        </Tooltip>
      </div>

      {/* Debug Panel */}
      {debugMode && currentPlan && (
        <div style={{
          backgroundColor: '#f0f0f0',
          padding: '8px',
          margin: '4px 0',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          maxHeight: '150px',
          overflow: 'auto'
        }}>
          <strong>Debug - Plan Details:</strong>
          <div>Steps: {currentPlan.steps.length}</div>
          {currentPlan.steps.map((step, i) => (
            <div key={step.id} style={{ marginLeft: '8px', color: '#666' }}>
              {i + 1}. {step.toolName}: {step.description}
              <div style={{ marginLeft: '16px', fontSize: '10px', color: '#999' }}>
                Args: {JSON.stringify(step.args).substring(0, 100)}...
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="messages-container">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Plan preview */}
        {currentPlan && (
          <PlanPreview
            plan={currentPlan}
            onApprove={onApprovePlan}
            onCancel={onCancelPlan}
            isExecuting={isLoading}
          />
        )}

        {/* Loading indicator */}
        {isLoading && !currentPlan && (
          <div className="progress-indicator">
            <Spinner size="tiny" />
            <span className="progress-text">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="input-container">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(_, data) => setInputValue(data.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me to help with your spreadsheet..."
          disabled={isLoading}
          resize="vertical"
          size="medium"
          style={{ flex: 1 }}
        />
        <Button
          icon={<Send20Regular />}
          appearance="primary"
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isLoading}
          aria-label="Send message"
          size="medium"
        />
      </div>
    </div>
  );
};
