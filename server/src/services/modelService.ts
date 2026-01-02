import { Model, ModelCatalog, ModelsResponse } from '@excel-ai-agent/shared';
import modelsConfig from '../config/models.json';

class ModelService {
  private catalog: ModelCatalog;

  constructor() {
    this.catalog = this.loadCatalog();
  }

  private loadCatalog(): ModelCatalog {
    // Start with models.json config
    const catalog: ModelCatalog = { models: modelsConfig.models as Model[] };

    // Override from environment variables if present
    const envOverrides = process.env.MODEL_OVERRIDES;
    if (envOverrides) {
      try {
        const overrides = JSON.parse(envOverrides);
        if (Array.isArray(overrides)) {
          for (const override of overrides) {
            const existingIndex = catalog.models.findIndex(m => m.id === override.id);
            if (existingIndex >= 0) {
              catalog.models[existingIndex] = { ...catalog.models[existingIndex], ...override };
            } else {
              catalog.models.push(override);
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse MODEL_OVERRIDES:', e);
      }
    }

    // Check for individual model enable/disable via env
    for (const model of catalog.models) {
      const envKey = `MODEL_${model.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_ENABLED`;
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        model.enabled = envValue.toLowerCase() === 'true';
      }
    }

    return catalog;
  }

  getEnabledModels(): ModelsResponse {
    const enabledModels = this.catalog.models.filter(m => m.enabled);

    // Determine default model
    let defaultModelId = (modelsConfig as { defaultModelId?: string }).defaultModelId;

    // Check if default model is enabled
    if (defaultModelId && !enabledModels.find(m => m.id === defaultModelId)) {
      defaultModelId = enabledModels[0]?.id;
    }

    return {
      models: enabledModels,
      defaultModelId,
    };
  }

  getModelById(id: string): Model | undefined {
    return this.catalog.models.find(m => m.id === id && m.enabled);
  }

  getAllModels(): Model[] {
    return this.catalog.models;
  }

  reloadCatalog(): void {
    this.catalog = this.loadCatalog();
  }
}

export const modelService = new ModelService();
