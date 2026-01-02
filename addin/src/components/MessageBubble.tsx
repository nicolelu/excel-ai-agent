import React from 'react';
import type { ChatMessage } from '@shared/types';

interface MessageBubbleProps {
  message: ChatMessage;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const getClassName = () => {
    switch (message.role) {
      case 'user':
        return 'message user';
      case 'assistant':
        return 'message assistant';
      case 'system':
        return 'message system';
      default:
        return 'message';
    }
  };

  // Render change log if present
  const renderChangeLog = () => {
    const changes = message.metadata?.stepResults
      ?.filter(r => r.success)
      ?.map(r => r.result as string);

    if (!changes || changes.length === 0) return null;

    return (
      <div className="change-log">
        <h4>Changes Made</h4>
        <ul>
          {changes.map((change, i) => (
            <li key={i}>{change}</li>
          ))}
        </ul>
      </div>
    );
  };

  // Render token usage if present
  const renderTokenUsage = () => {
    const usage = message.metadata?.tokenUsage;
    if (!usage) return null;

    return (
      <div className="token-estimate">
        Tokens: {usage.totalTokens.toLocaleString()}
        {usage.estimatedCost && ` (~$${usage.estimatedCost.toFixed(4)})`}
      </div>
    );
  };

  return (
    <div className={getClassName()}>
      <div className="message-content">{message.content}</div>
      {renderChangeLog()}
      {renderTokenUsage()}
    </div>
  );
};
