/**
 * Excel Tool Layer - Deterministic Office.js operations
 */

import type {
  ToolResult,
  WorkbookSchema,
  SheetSchema,
  TableInfo,
  ChartInfo,
  PivotTableInfo,
  NamedRangeInfo,
  RangeValues,
  GetWorkbookSchemaArgs,
  GetRangeValuesArgs,
  CreateSheetArgs,
  EnsureTableArgs,
  WriteRangeArgs,
  SetFormulaArgs,
  CreateChartArgs,
  CreatePivotTableArgs,
  FormatRangeArgs,
  AddNamedRangeArgs,
  ChartType,
} from '@shared/types';
import { ledgerService } from '../services/ledgerService';

// Map our chart types to Excel chart types
const chartTypeMap: Record<ChartType, Excel.ChartType> = {
  columnClustered: Excel.ChartType.columnClustered,
  columnStacked: Excel.ChartType.columnStacked,
  barClustered: Excel.ChartType.barClustered,
  barStacked: Excel.ChartType.barStacked,
  line: Excel.ChartType.line,
  lineMarkers: Excel.ChartType.lineMarkers,
  pie: Excel.ChartType.pie,
  doughnut: Excel.ChartType.doughnut,
  area: Excel.ChartType.area,
  scatter: Excel.ChartType.xyscatter,
  bubble: Excel.ChartType.bubble,
};

class ExcelTools {
  /**
   * Get the workbook schema including sheets, tables, charts, etc.
   */
  async getWorkbookSchema(args: GetWorkbookSchemaArgs = {}): Promise<ToolResult> {
    try {
      return await Excel.run(async (context) => {
        const workbook = context.workbook;
        workbook.load('name');

        const sheets = workbook.worksheets;
        sheets.load('items/name,items/position');

        const namedItems = workbook.names;
        namedItems.load('items/name,items/value');

        // Get active sheet and selection
        const activeSheet = workbook.worksheets.getActiveWorksheet();
        activeSheet.load('name');

        const selection = context.workbook.getSelectedRange();
        selection.load('address');

        await context.sync();

        const sheetSchemas: SheetSchema[] = [];

        for (const sheet of sheets.items) {
          const sheetSchema: SheetSchema = {
            name: sheet.name,
            tables: [],
            charts: [],
            pivotTables: [],
          };

          // Get used range
          try {
            const usedRange = sheet.getUsedRange();
            usedRange.load('address');
            await context.sync();
            sheetSchema.usedRange = usedRange.address.split('!')[1];
          } catch {
            // Sheet might be empty
          }

          // Get tables
          const tables = sheet.tables;
          tables.load('items/name');

          // Get charts if requested
          if (args.includeCharts !== false) {
            const charts = sheet.charts;
            charts.load('items/name,items/chartType');
          }

          // Get pivot tables if requested
          if (args.includePivots !== false) {
            const pivots = sheet.pivotTables;
            pivots.load('items/name');
          }

          await context.sync();

          // Process tables
          for (const table of tables.items) {
            const tableRange = table.getRange();
            tableRange.load('address');
            const headerRange = table.getHeaderRowRange();
            headerRange.load('values,rowCount');
            const bodyRange = table.getDataBodyRange();
            bodyRange.load('rowCount');
            await context.sync();

            const tableInfo: TableInfo = {
              name: table.name,
              address: tableRange.address.split('!')[1],
              headerRow: headerRange.values[0].map(v => String(v)),
              rowCount: bodyRange.rowCount,
            };
            sheetSchema.tables.push(tableInfo);
          }

          // Process charts
          if (args.includeCharts !== false) {
            const charts = sheet.charts;
            for (const chart of charts.items) {
              const chartInfo: ChartInfo = {
                name: chart.name,
                type: chart.chartType,
              };
              sheetSchema.charts.push(chartInfo);
            }
          }

          // Process pivot tables
          if (args.includePivots !== false) {
            const pivots = sheet.pivotTables;
            for (const pivot of pivots.items) {
              const pivotInfo: PivotTableInfo = {
                name: pivot.name,
              };
              sheetSchema.pivotTables.push(pivotInfo);
            }
          }

          sheetSchemas.push(sheetSchema);
        }

        // Process named ranges
        const namedRanges: NamedRangeInfo[] = namedItems.items.map(item => ({
          name: item.name,
          address: item.value,
          sheetName: item.value.split('!')[0].replace(/'/g, ''),
        }));

        const schema: WorkbookSchema = {
          name: workbook.name,
          sheets: sheetSchemas,
          namedRanges,
          activeSheet: activeSheet.name,
          activeSelection: selection.address.split('!')[1],
        };

        return {
          success: true,
          data: schema,
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workbook schema',
      };
    }
  }

  /**
   * Read values from a range
   */
  async getRangeValues(args: GetRangeValuesArgs): Promise<ToolResult> {
    const { sheetName, address, maxCells = 1000 } = args;

    try {
      return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        const range = sheet.getRange(address);
        range.load('values,rowCount,columnCount,address');
        await context.sync();

        const totalCells = range.rowCount * range.columnCount;
        let values = range.values;
        let sampled = false;

        // Sample if too large
        if (totalCells > maxCells) {
          const maxRows = Math.floor(maxCells / range.columnCount);
          values = values.slice(0, maxRows);
          sampled = true;
        }

        const result: RangeValues = {
          address: range.address.split('!')[1],
          values,
          rowCount: range.rowCount,
          columnCount: range.columnCount,
          sampled,
          totalCells,
        };

        return {
          success: true,
          data: result,
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read range values',
      };
    }
  }

  /**
   * Create a new worksheet
   */
  async createSheet(args: CreateSheetArgs): Promise<ToolResult> {
    const { name, position } = args;

    try {
      return await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load('items/name');
        await context.sync();

        // Check for name collision and generate unique name
        const existingNames = sheets.items.map(s => s.name);
        const uniqueName = await ledgerService.generateUniqueName(name, existingNames);

        let newSheet: Excel.Worksheet;

        if (position === 'beginning') {
          newSheet = sheets.add(uniqueName);
          newSheet.position = 0;
        } else if (typeof position === 'number') {
          newSheet = sheets.add(uniqueName);
          newSheet.position = position;
        } else {
          // Default: add at end
          newSheet = sheets.add(uniqueName);
        }

        await context.sync();

        return {
          success: true,
          data: { sheetName: uniqueName },
          artifactId: uniqueName,
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create sheet',
      };
    }
  }

  /**
   * Ensure a table exists (create or find existing)
   */
  async ensureTable(args: EnsureTableArgs): Promise<ToolResult> {
    const { sheetName, addressOrUsedRange, tableName, hasHeaders = true } = args;

    try {
      return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);

        // Check if table already exists
        const tables = context.workbook.tables;
        tables.load('items/name');
        await context.sync();

        const existingTable = tables.items.find(t => t.name === tableName);
        if (existingTable) {
          const existingRange = existingTable.getRange();
          existingRange.load('address');
          await context.sync();
          return {
            success: true,
            data: { tableName, address: existingRange.address, alreadyExists: true },
            artifactId: tableName,
          };
        }

        // Determine the range
        let range: Excel.Range;
        if (addressOrUsedRange === 'usedRange') {
          range = sheet.getUsedRange();
        } else {
          range = sheet.getRange(addressOrUsedRange);
        }

        // Generate unique name
        const existingNames = tables.items.map(t => t.name);
        const uniqueName = await ledgerService.generateUniqueName(tableName, existingNames);

        // Create the table
        const table = sheet.tables.add(range, hasHeaders);
        table.name = uniqueName;
        const newTableRange = table.getRange();
        newTableRange.load('address');
        await context.sync();

        return {
          success: true,
          data: { tableName: uniqueName, address: newTableRange.address },
          artifactId: uniqueName,
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create table',
      };
    }
  }

  /**
   * Write values to a range
   */
  async writeRange(args: WriteRangeArgs): Promise<ToolResult> {
    const { sheetName, address, values } = args;

    try {
      return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);

        // Calculate the range dimensions
        const rowCount = values.length;
        const colCount = Math.max(...values.map(row => row.length));

        // Normalize the values array
        const normalizedValues = values.map(row => {
          const newRow = [...row];
          while (newRow.length < colCount) {
            newRow.push('');
          }
          return newRow;
        });

        // Parse the starting cell
        const startCell = address.split(':')[0];
        const match = startCell.match(/([A-Z]+)(\d+)/i);
        if (!match) {
          throw new Error(`Invalid address: ${address}`);
        }

        const startCol = match[1];
        const startRow = parseInt(match[2], 10);

        // Calculate end address
        const endCol = this.incrementColumn(startCol, colCount - 1);
        const endRow = startRow + rowCount - 1;
        const fullAddress = `${startCol}${startRow}:${endCol}${endRow}`;

        const range = sheet.getRange(fullAddress);
        range.values = normalizedValues;
        await context.sync();

        return {
          success: true,
          data: { address: fullAddress, rowCount, colCount },
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to write range',
      };
    }
  }

  private incrementColumn(col: string, increment: number): string {
    let result = 0;
    for (let i = 0; i < col.length; i++) {
      result = result * 26 + (col.charCodeAt(i) - 64);
    }
    result += increment;

    let newCol = '';
    while (result > 0) {
      const remainder = (result - 1) % 26;
      newCol = String.fromCharCode(65 + remainder) + newCol;
      result = Math.floor((result - 1) / 26);
    }
    return newCol;
  }

  /**
   * Set a formula in a cell or range
   */
  async setFormula(args: SetFormulaArgs): Promise<ToolResult> {
    const { sheetName, address, formula } = args;

    try {
      return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        const range = sheet.getRange(address);

        // Set formula (handles both single cell and range)
        if (address.includes(':')) {
          range.formulas = [[formula]];
        } else {
          range.formulas = [[formula]];
        }

        await context.sync();

        return {
          success: true,
          data: { address, formula },
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set formula',
      };
    }
  }

  /**
   * Create a chart
   */
  async createChart(args: CreateChartArgs): Promise<ToolResult> {
    const {
      sheetName,
      sourceAddress,
      chartType,
      destinationAddress,
      title,
      width = 500,
      height = 300,
    } = args;

    try {
      return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        const dataRange = sheet.getRange(sourceAddress);

        // Get existing chart names
        const existingCharts = sheet.charts;
        existingCharts.load('items/name');
        await context.sync();

        const existingNames = existingCharts.items.map(c => c.name);
        const chartName = await ledgerService.generateUniqueName(
          title || `Chart_${Date.now()}`,
          existingNames
        );

        // Create the chart
        const excelChartType = chartTypeMap[chartType] || Excel.ChartType.columnClustered;
        const chart = sheet.charts.add(excelChartType, dataRange, Excel.ChartSeriesBy.auto);

        chart.name = chartName;
        chart.width = width;
        chart.height = height;

        if (title) {
          chart.title.text = title;
        }

        // Position the chart if specified
        if (destinationAddress) {
          const destCell = sheet.getRange(destinationAddress);
          chart.setPosition(destCell);
        }

        await context.sync();

        return {
          success: true,
          data: { chartName, chartType, dataRange: sourceAddress },
          artifactId: chartName,
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create chart',
      };
    }
  }

  /**
   * Create a pivot table
   */
  async createPivotTable(args: CreatePivotTableArgs): Promise<ToolResult> {
    const {
      pivotName,
      sourceAddressOrTable,
      destinationSheet,
      destinationCell,
      rows = [],
      columns = [],
      values = [],
      filters = [],
    } = args;

    try {
      return await Excel.run(async (context) => {
        // Get or create destination sheet
        let destSheet: Excel.Worksheet;
        try {
          destSheet = context.workbook.worksheets.getItem(destinationSheet);
        } catch {
          destSheet = context.workbook.worksheets.add(destinationSheet);
        }

        // Determine source range
        let sourceRange: Excel.Range;
        const tables = context.workbook.tables;
        tables.load('items/name');
        await context.sync();

        const sourceTable = tables.items.find(t => t.name === sourceAddressOrTable);
        if (sourceTable) {
          sourceRange = sourceTable.getRange();
        } else {
          // Assume it's a range address on the first sheet
          const sheet = context.workbook.worksheets.getFirst();
          sourceRange = sheet.getRange(sourceAddressOrTable);
        }

        // Get existing pivot names
        const existingPivots = destSheet.pivotTables;
        existingPivots.load('items/name');
        await context.sync();

        const existingNames = existingPivots.items.map(p => p.name);
        const uniquePivotName = await ledgerService.generateUniqueName(pivotName, existingNames);

        // Create pivot table
        const destRange = destSheet.getRange(destinationCell);
        const pivotTable = context.workbook.worksheets
          .getItem(destinationSheet)
          .pivotTables.add(uniquePivotName, sourceRange, destRange);

        await context.sync();

        // Add row fields
        for (const field of rows) {
          try {
            const hierarchyCollection = pivotTable.rowHierarchies;
            hierarchyCollection.add(pivotTable.hierarchies.getItem(field));
          } catch (e) {
            console.warn(`Failed to add row field ${field}:`, e);
          }
        }

        // Add column fields
        for (const field of columns) {
          try {
            pivotTable.columnHierarchies.add(pivotTable.hierarchies.getItem(field));
          } catch (e) {
            console.warn(`Failed to add column field ${field}:`, e);
          }
        }

        // Add value fields
        for (const valueField of values) {
          try {
            const dataHierarchy = pivotTable.dataHierarchies.add(
              pivotTable.hierarchies.getItem(valueField.field)
            );
            if (valueField.summarizeBy) {
              const aggregation = this.mapAggregation(valueField.summarizeBy);
              dataHierarchy.summarizeBy = aggregation;
            }
            if (valueField.name) {
              dataHierarchy.name = valueField.name;
            }
          } catch (e) {
            console.warn(`Failed to add value field ${valueField.field}:`, e);
          }
        }

        // Add filter fields
        for (const field of filters) {
          try {
            pivotTable.filterHierarchies.add(pivotTable.hierarchies.getItem(field));
          } catch (e) {
            console.warn(`Failed to add filter field ${field}:`, e);
          }
        }

        await context.sync();

        return {
          success: true,
          data: { pivotName: uniquePivotName, destinationSheet, destinationCell },
          artifactId: uniquePivotName,
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create pivot table',
      };
    }
  }

  private mapAggregation(summarizeBy: string): Excel.AggregationFunction {
    switch (summarizeBy) {
      case 'sum':
        return Excel.AggregationFunction.sum;
      case 'count':
        return Excel.AggregationFunction.count;
      case 'average':
        return Excel.AggregationFunction.average;
      case 'max':
        return Excel.AggregationFunction.max;
      case 'min':
        return Excel.AggregationFunction.min;
      default:
        return Excel.AggregationFunction.sum;
    }
  }

  /**
   * Format a range
   */
  async formatRange(args: FormatRangeArgs): Promise<ToolResult> {
    const { sheetName, address, format } = args;

    try {
      return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        const range = sheet.getRange(address);
        const rangeFormat = range.format;

        if (format.bold !== undefined) {
          rangeFormat.font.bold = format.bold;
        }
        if (format.italic !== undefined) {
          rangeFormat.font.italic = format.italic;
        }
        if (format.underline !== undefined) {
          rangeFormat.font.underline = format.underline ? Excel.RangeUnderlineStyle.single : Excel.RangeUnderlineStyle.none;
        }
        if (format.fontSize !== undefined) {
          rangeFormat.font.size = format.fontSize;
        }
        if (format.fontColor !== undefined) {
          rangeFormat.font.color = format.fontColor;
        }
        if (format.backgroundColor !== undefined) {
          rangeFormat.fill.color = format.backgroundColor;
        }
        if (format.numberFormat !== undefined) {
          range.numberFormat = [[format.numberFormat]];
        }
        if (format.horizontalAlignment !== undefined) {
          rangeFormat.horizontalAlignment = format.horizontalAlignment as Excel.HorizontalAlignment;
        }
        if (format.verticalAlignment !== undefined) {
          rangeFormat.verticalAlignment = format.verticalAlignment as Excel.VerticalAlignment;
        }
        if (format.wrapText !== undefined) {
          rangeFormat.wrapText = format.wrapText;
        }

        // Handle borders
        if (format.borders) {
          const borderStyles = format.borders;
          if (borderStyles.all) {
            const style = this.mapBorderStyle(borderStyles.all.style) as Excel.BorderLineStyle;
            rangeFormat.borders.getItem('EdgeTop').style = style;
            rangeFormat.borders.getItem('EdgeBottom').style = style;
            rangeFormat.borders.getItem('EdgeLeft').style = style;
            rangeFormat.borders.getItem('EdgeRight').style = style;
            if (borderStyles.all.color) {
              rangeFormat.borders.getItem('EdgeTop').color = borderStyles.all.color;
              rangeFormat.borders.getItem('EdgeBottom').color = borderStyles.all.color;
              rangeFormat.borders.getItem('EdgeLeft').color = borderStyles.all.color;
              rangeFormat.borders.getItem('EdgeRight').color = borderStyles.all.color;
            }
          }
          // Individual borders can be set here too
        }

        await context.sync();

        return {
          success: true,
          data: { address, formatsApplied: Object.keys(format) },
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to format range',
      };
    }
  }

  private mapBorderStyle(style?: string): string {
    switch (style) {
      case 'thin':
        return 'Thin';
      case 'medium':
        return 'Medium';
      case 'thick':
        return 'Thick';
      case 'dashed':
        return 'Dash';
      case 'dotted':
        return 'Dot';
      case 'double':
        return 'Double';
      default:
        return 'Thin';
    }
  }

  /**
   * Add a named range
   */
  async addNamedRange(args: AddNamedRangeArgs): Promise<ToolResult> {
    const { name, sheetName, address } = args;

    try {
      return await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(sheetName);
        const range = sheet.getRange(address);

        // Check for existing named ranges
        const names = context.workbook.names;
        names.load('items/name');
        await context.sync();

        const existingNames = names.items.map(n => n.name);
        const uniqueName = await ledgerService.generateUniqueName(name, existingNames);

        // Create the named range
        context.workbook.names.add(uniqueName, range, '');
        await context.sync();

        return {
          success: true,
          data: { name: uniqueName, sheetName, address },
          artifactId: uniqueName,
        };
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add named range',
      };
    }
  }
}

export const excelTools = new ExcelTools();
