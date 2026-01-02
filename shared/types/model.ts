/**
 * Model catalog types shared between server and add-in
 */

export interface Model {
  id: string;
  label: string;
  provider: 'openai' | 'anthropic' | 'google';
  family: string;
  supportsToolCalling: boolean;
  defaultTemperature?: number;
  enabled: boolean;
}

export interface ModelCatalog {
  models: Model[];
}

export interface ModelsResponse {
  models: Model[];
  defaultModelId?: string;
}
