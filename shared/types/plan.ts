/**
 * Plan step types for the Plan/Apply workflow
 */

import { RiskLevel, ToolName } from './tool';

export interface PlanStep {
  id: string;
  description: string;
  toolName: ToolName;
  args: Record<string, unknown>;
  expectedEffect: string;
  riskLevel: RiskLevel;
  preconditions: string[];
  postconditions: string[];
}

export interface ExecutionPlan {
  id: string;
  createdAt: number;
  description: string;
  steps: PlanStep[];
  estimatedTokens?: number;
  estimatedCost?: number;
}

export interface PlanStepResult {
  stepId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  duration: number;
  artifactId?: string;
}

export interface PlanExecutionResult {
  planId: string;
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  stepResults: PlanStepResult[];
  summary: string;
  errors: string[];
  duration: number;
}

export interface PlanValidationResult {
  valid: boolean;
  errors: PlanValidationError[];
  warnings: PlanValidationWarning[];
}

export interface PlanValidationError {
  stepId: string;
  message: string;
  code: string;
}

export interface PlanValidationWarning {
  stepId: string;
  message: string;
  code: string;
}
