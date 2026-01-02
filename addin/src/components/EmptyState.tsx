import React from 'react';
import {
  ChartMultiple20Regular,
  TableSimple20Regular,
  DocumentBulletList20Regular,
  Grid20Regular,
} from '@fluentui/react-icons';

interface EmptyStateProps {
  onTemplateSelect: (template: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onTemplateSelect }) => {
  const templates = [
    {
      id: 'chart',
      title: 'Create a Chart',
      description: 'Visualize data with a chart',
      icon: <ChartMultiple20Regular />,
    },
    {
      id: 'pivot',
      title: 'Create a Pivot Table',
      description: 'Summarize and analyze data',
      icon: <TableSimple20Regular />,
    },
    {
      id: 'financial',
      title: '3-Statement Model',
      description: 'Income, Balance, Cash Flow',
      icon: <DocumentBulletList20Regular />,
    },
    {
      id: 'cube',
      title: 'PE Customer Cube',
      description: 'Normalized data with pivot views',
      icon: <Grid20Regular />,
    },
  ];

  return (
    <div className="empty-state">
      <h2>What would you like to do?</h2>
      <p>Start a conversation or try a quick template:</p>
      <div className="template-list">
        {templates.map((template) => (
          <button
            key={template.id}
            className="template-button"
            onClick={() => onTemplateSelect(template.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {template.icon}
              <div>
                <h4>{template.title}</h4>
                <p>{template.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
