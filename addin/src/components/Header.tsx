import React from 'react';
import {
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
  MenuPopover,
  Button,
  Tooltip,
} from '@fluentui/react-components';
import { ArrowSync20Regular, ChevronDown12Regular } from '@fluentui/react-icons';
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
  const selectedModel = models.find(m => m.id === selectedModelId);
  const modelLabel = selectedModel?.label || 'Select model';

  return (
    <div className="app-header">
      <h1>Excel AI Assistant</h1>
      <div className="header-model-selector">
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <button className="model-button">
              <span className="model-name">{modelLabel}</span>
              <ChevronDown12Regular />
            </button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {models.map((model) => (
                <MenuItem
                  key={model.id}
                  onClick={() => onModelChange(model.id)}
                >
                  {model.label}
                </MenuItem>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
        <Tooltip content="Refresh models" relationship="label">
          <Button
            icon={<ArrowSync20Regular />}
            appearance="subtle"
            size="small"
            onClick={onRefreshModels}
            aria-label="Refresh models"
          />
        </Tooltip>
      </div>
    </div>
  );
};
