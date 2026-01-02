import { useState, useEffect, useCallback } from 'react';
import { excelTools } from '../tools';
import type { WorkbookSchema, SelectionContext } from '@shared/types';

interface UseWorkbookSchemaResult {
  schema: WorkbookSchema | null;
  selectionContext: SelectionContext | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWorkbookSchema(): UseWorkbookSchemaResult {
  const [schema, setSchema] = useState<WorkbookSchema | null>(null);
  const [selectionContext, setSelectionContext] = useState<SelectionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await excelTools.getWorkbookSchema({
        includeCharts: true,
        includePivots: true,
      });

      if (result.success && result.data) {
        const workbookSchema = result.data as WorkbookSchema;
        setSchema(workbookSchema);

        // Get selection context
        if (workbookSchema.activeSelection && workbookSchema.activeSheet) {
          try {
            const rangeResult = await excelTools.getRangeValues({
              sheetName: workbookSchema.activeSheet,
              address: workbookSchema.activeSelection,
              maxCells: 100,
            });

            if (rangeResult.success && rangeResult.data) {
              setSelectionContext({
                address: workbookSchema.activeSelection,
                sheetName: workbookSchema.activeSheet,
                values: (rangeResult.data as { values: unknown[][] }).values,
              });
            }
          } catch (e) {
            console.warn('Failed to get selection values:', e);
          }
        }
      } else {
        setError(result.error || 'Failed to get workbook schema');
      }
    } catch (e) {
      console.error('Failed to fetch workbook schema:', e);
      setError(e instanceof Error ? e.message : 'Failed to read workbook');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchema();

    // Listen for selection changes
    let selectionHandler: OfficeExtension.EventHandlerResult<Excel.SelectionChangedEventArgs> | null = null;

    const setupSelectionListener = async () => {
      try {
        await Excel.run(async (context) => {
          const workbook = context.workbook;
          selectionHandler = workbook.onSelectionChanged.add(async () => {
            // Debounced refresh
            setTimeout(fetchSchema, 100);
          });
          await context.sync();
        });
      } catch (e) {
        console.warn('Failed to setup selection listener:', e);
      }
    };

    setupSelectionListener();

    return () => {
      if (selectionHandler) {
        Excel.run(async (context) => {
          selectionHandler?.remove();
          await context.sync();
        }).catch(console.warn);
      }
    };
  }, [fetchSchema]);

  return {
    schema,
    selectionContext,
    loading,
    error,
    refresh: fetchSchema,
  };
}
