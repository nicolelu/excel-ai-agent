import React from 'react';
import {
  Dropdown,
  Option,
  Button,
  Tooltip,
} from '@fluentui/react-components';
import { ArrowSync20Regular } from '@fluentui/react-icons';
import type { Model } from '@shared/types';

interface HeaderProps {
  models: Model[];
  selectedModelId: string | null;
  onModelChange: (modelId: string) => void;
  onRefreshModels: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  models,
  selectedModelId,
  onModelChange,
  onRefreshModels,
}) => {
  return (
    <div className="app-header">
      <h1>Excel AI Assistant</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Dropdown
          className="model-selector"
          placeholder="Select model"
          value={selectedModelId || ''}
          selectedOptions={selectedModelId ? [selectedModelId] : []}
          onOptionSelect={(_, data) => {
            if (data.optionValue) {
              onModelChange(data.optionValue);
            }
          }}
          disabled={models.length === 0}
        >
          {models.map((model) => (
            <Option key={model.id} value={model.id}>
              {model.label}
            </Option>
          ))}
        </Dropdown>
        <Tooltip content="Refresh models" relationship="label">
          <Button
            icon={<ArrowSync20Regular />}
            appearance="subtle"
            onClick={onRefreshModels}
            aria-label="Refresh models"
          />
        </Tooltip>
      </div>
    </div>
  );
};
