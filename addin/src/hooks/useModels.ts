import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import type { Model } from '@shared/types';

interface UseModelsResult {
  models: Model[];
  defaultModelId: string | undefined;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useModels(): UseModelsResult {
  const [models, setModels] = useState<Model[]>([]);
  const [defaultModelId, setDefaultModelId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getModels();
      setModels(response.models);
      setDefaultModelId(response.defaultModelId);
    } catch (e) {
      console.error('Failed to fetch models:', e);
      setError(e instanceof Error ? e.message : 'Failed to load models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    defaultModelId,
    loading,
    error,
    refresh: fetchModels,
  };
}
