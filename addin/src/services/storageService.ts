/**
 * Storage Service - Handles Office add-in local storage
 */

const STORAGE_KEYS = {
  SELECTED_MODEL: 'excel-ai-agent:selectedModel',
  CONTEXT_SCOPE: 'excel-ai-agent:contextScope',
  PREFERENCES: 'excel-ai-agent:preferences',
};

class StorageService {
  private useOfficeStorage: boolean;

  constructor() {
    // Check if Office.js storage is available
    this.useOfficeStorage = typeof Office !== 'undefined' &&
                            Office.context &&
                            Office.context.document &&
                            Office.context.document.settings !== undefined;
  }

  async getSelectedModel(): Promise<string | null> {
    if (this.useOfficeStorage) {
      return new Promise((resolve) => {
        try {
          const value = Office.context.document.settings.get(STORAGE_KEYS.SELECTED_MODEL);
          resolve(value || null);
        } catch {
          resolve(localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL));
        }
      });
    }
    return localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL);
  }

  async setSelectedModel(modelId: string): Promise<void> {
    if (this.useOfficeStorage) {
      return new Promise((resolve) => {
        try {
          Office.context.document.settings.set(STORAGE_KEYS.SELECTED_MODEL, modelId);
          Office.context.document.settings.saveAsync((result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              resolve();
            } else {
              // Fallback to localStorage
              localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, modelId);
              resolve();
            }
          });
        } catch {
          localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, modelId);
          resolve();
        }
      });
    }
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, modelId);
  }

  async getPreferences<T extends object>(): Promise<T | null> {
    try {
      let value: string | null = null;

      if (this.useOfficeStorage) {
        value = Office.context.document.settings.get(STORAGE_KEYS.PREFERENCES);
      }

      if (!value) {
        value = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      }

      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async setPreferences<T extends object>(preferences: T): Promise<void> {
    const value = JSON.stringify(preferences);

    if (this.useOfficeStorage) {
      return new Promise((resolve) => {
        try {
          Office.context.document.settings.set(STORAGE_KEYS.PREFERENCES, value);
          Office.context.document.settings.saveAsync(() => {
            resolve();
          });
        } catch {
          localStorage.setItem(STORAGE_KEYS.PREFERENCES, value);
          resolve();
        }
      });
    }

    localStorage.setItem(STORAGE_KEYS.PREFERENCES, value);
  }

  async clearAll(): Promise<void> {
    if (this.useOfficeStorage) {
      return new Promise((resolve) => {
        try {
          for (const key of Object.values(STORAGE_KEYS)) {
            Office.context.document.settings.remove(key);
          }
          Office.context.document.settings.saveAsync(() => {
            // Also clear localStorage
            for (const key of Object.values(STORAGE_KEYS)) {
              localStorage.removeItem(key);
            }
            resolve();
          });
        } catch {
          for (const key of Object.values(STORAGE_KEYS)) {
            localStorage.removeItem(key);
          }
          resolve();
        }
      });
    }

    for (const key of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(key);
    }
  }
}

export const storageService = new StorageService();
