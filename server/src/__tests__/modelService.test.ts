/**
 * Model Service Tests
 */

import { modelService } from '../services/modelService';

describe('ModelService', () => {
  describe('getEnabledModels', () => {
    it('should return enabled models only', () => {
      const result = modelService.getEnabledModels();

      expect(result.models).toBeDefined();
      expect(Array.isArray(result.models)).toBe(true);

      // All returned models should be enabled
      for (const model of result.models) {
        expect(model.enabled).toBe(true);
      }
    });

    it('should include a default model ID', () => {
      const result = modelService.getEnabledModels();

      // If there are enabled models, default should be set
      if (result.models.length > 0) {
        expect(result.defaultModelId).toBeDefined();
        // Default model should be in the enabled list
        const defaultExists = result.models.some(m => m.id === result.defaultModelId);
        expect(defaultExists).toBe(true);
      }
    });

    it('should return models with required fields', () => {
      const result = modelService.getEnabledModels();

      for (const model of result.models) {
        expect(model.id).toBeDefined();
        expect(model.label).toBeDefined();
        expect(model.provider).toBeDefined();
        expect(['openai', 'anthropic', 'google']).toContain(model.provider);
        expect(model.family).toBeDefined();
        expect(typeof model.supportsToolCalling).toBe('boolean');
      }
    });
  });

  describe('getModelById', () => {
    it('should return a model when it exists and is enabled', () => {
      const { models } = modelService.getEnabledModels();

      if (models.length > 0) {
        const model = modelService.getModelById(models[0].id);
        expect(model).toBeDefined();
        expect(model?.id).toBe(models[0].id);
      }
    });

    it('should return undefined for non-existent model', () => {
      const model = modelService.getModelById('non-existent-model');
      expect(model).toBeUndefined();
    });

    it('should return undefined for disabled model', () => {
      // gpt-3.5-turbo is disabled in default config
      const model = modelService.getModelById('gpt-3.5-turbo');
      expect(model).toBeUndefined();
    });
  });

  describe('getAllModels', () => {
    it('should return all models including disabled', () => {
      const allModels = modelService.getAllModels();
      const enabledModels = modelService.getEnabledModels().models;

      // All models should include both enabled and disabled
      expect(allModels.length).toBeGreaterThanOrEqual(enabledModels.length);

      // Check that we have at least one disabled model
      const hasDisabled = allModels.some(m => !m.enabled);
      expect(hasDisabled).toBe(true);
    });
  });

  describe('reloadCatalog', () => {
    it('should reload without error', () => {
      expect(() => modelService.reloadCatalog()).not.toThrow();
    });

    it('should still return valid models after reload', () => {
      modelService.reloadCatalog();
      const result = modelService.getEnabledModels();
      expect(result.models).toBeDefined();
      expect(Array.isArray(result.models)).toBe(true);
    });
  });
});
