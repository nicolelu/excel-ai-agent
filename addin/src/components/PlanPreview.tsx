import React from 'react';
import { Button, Badge, Spinner } from '@fluentui/react-components';
import {
  Checkmark20Regular,
  Dismiss20Regular,
  Warning20Regular,
} from '@fluentui/react-icons';
import type { ExecutionPlan, RiskLevel } from '@shared/types';

interface PlanPreviewProps {
  plan: ExecutionPlan;
  onApprove: () => void;
  onCancel: () => void;
  isExecuting: boolean;
  completedSteps?: string[];
  currentStep?: string;
}

export const PlanPreview: React.FC<PlanPreviewProps> = ({
  plan,
  onApprove,
  onCancel,
  isExecuting,
  completedSteps = [],
  currentStep,
}) => {
  const getRiskBadge = (level: RiskLevel) => {
    switch (level) {
      case 'read':
        return <Badge appearance="filled" color="success" size="small">Read</Badge>;
      case 'write':
        return <Badge appearance="filled" color="warning" size="small">Write</Badge>;
      case 'destructive':
        return <Badge appearance="filled" color="danger" size="small">Destructive</Badge>;
      default:
        return null;
    }
  };

  const getStepStatus = (stepId: string) => {
    if (completedSteps.includes(stepId)) {
      return 'completed';
    }
    if (currentStep === stepId) {
      return 'executing';
    }
    return 'pending';
  };

  const hasDestructiveSteps = plan.steps.some(s => s.riskLevel === 'destructive');

  return (
    <div className="plan-preview">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3>Execution Plan</h3>
        {hasDestructiveSteps && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}>
            <Warning20Regular />
            <span style={{ fontSize: '12px' }}>Contains destructive operations</span>
          </div>
        )}
      </div>

      <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
        {plan.description}
      </p>

      <div style={{ marginBottom: '12px' }}>
        {plan.steps.map((step, index) => {
          const status = getStepStatus(step.id);
          return (
            <div key={step.id} className="plan-step">
              <div
                className="step-number"
                style={{
                  backgroundColor:
                    status === 'completed'
                      ? '#22c55e'
                      : status === 'executing'
                        ? '#0078d4'
                        : '#999',
                }}
              >
                {status === 'completed' ? (
                  <Checkmark20Regular style={{ width: 14, height: 14 }} />
                ) : status === 'executing' ? (
                  <Spinner size="extra-tiny" />
                ) : (
                  index + 1
                )}
              </div>
              <div className="step-content">
                <div className="step-description">
                  {step.description}
                  <span style={{ marginLeft: '8px' }}>{getRiskBadge(step.riskLevel)}</span>
                </div>
                <div className="step-tool">
                  {step.toolName}({Object.keys(step.args).join(', ')})
                </div>
                {step.expectedEffect && (
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    → {step.expectedEffect}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {plan.estimatedTokens && (
        <div className="token-estimate">
          Estimated tokens: {plan.estimatedTokens.toLocaleString()}
          {plan.estimatedCost && ` (~$${plan.estimatedCost.toFixed(4)})`}
        </div>
      )}

      <div className="plan-actions">
        <Button
          appearance="secondary"
          onClick={onCancel}
          disabled={isExecuting}
          icon={<Dismiss20Regular />}
        >
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={onApprove}
          disabled={isExecuting}
          icon={isExecuting ? <Spinner size="tiny" /> : <Checkmark20Regular />}
        >
          {isExecuting ? 'Executing...' : 'Apply Plan'}
        </Button>
      </div>
    </div>
  );
};
