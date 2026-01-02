import React, { useState, useRef, useEffect } from 'react';
import {
  Button,
  Textarea,
  Spinner,
  Dropdown,
  Option,
  Tooltip,
} from '@fluentui/react-components';
import {
  Send20Regular,
  Delete20Regular,
  ArrowSync20Regular,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        <span style={{ fontSize: '12px', color: '#666' }}>Context:</span>
        <Dropdown
          size="small"
          value={scopeOptions.find(o => o.value === contextScope)?.label || ''}
          selectedOptions={[contextScope]}
          onOptionSelect={(_, data) => {
            if (data.optionValue) {
              onContextScopeChange(data.optionValue as ContextScope);
            }
          }}
          style={{ minWidth: '140px' }}
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
          style={{ minHeight: '40px' }}
        />
        <Button
          icon={<Send20Regular />}
          appearance="primary"
          onClick={handleSubmit}
          disabled={!inputValue.trim() || isLoading}
          aria-label="Send message"
        />
      </div>
    </div>
  );
};
