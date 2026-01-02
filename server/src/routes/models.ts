import { Router, Request, Response } from 'express';
import { modelService } from '../services/modelService';

export const modelsRouter = Router();

/**
 * GET /models
 * Returns enabled models from the catalog
 */
modelsRouter.get('/', (_req: Request, res: Response) => {
  try {
    const response = modelService.getEnabledModels();
    res.json(response);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      error: 'Failed to fetch models',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /models/refresh
 * Reloads the model catalog from config
 */
modelsRouter.post('/refresh', (_req: Request, res: Response) => {
  try {
    modelService.reloadCatalog();
    const response = modelService.getEnabledModels();
    res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    console.error('Error refreshing models:', error);
    res.status(500).json({
      error: 'Failed to refresh models',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
