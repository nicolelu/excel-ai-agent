/**
 * Tool definitions for Excel operations
 * These are the deterministic tools that the LLM can invoke
 */

export type RiskLevel = 'read' | 'write' | 'destructive';

export interface ToolDefinition {
  name: string;
  description: string;
  riskLevel: RiskLevel;
  parameters: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
}

// Tool argument types

export interface GetWorkbookSchemaArgs {
  includeFormulas?: boolean;
  includeCharts?: boolean;
  includePivots?: boolean;
}

export interface GetRangeValuesArgs {
  sheetName: string;
  address: string;
  maxCells?: number;
}

export interface CreateSheetArgs {
  name: string;
  position?: 'end' | 'beginning' | number;
}

export interface EnsureTableArgs {
  sheetName: string;
  addressOrUsedRange: string | 'usedRange';
  tableName: string;
  hasHeaders?: boolean;
}

export interface WriteRangeArgs {
  sheetName: string;
  address: string;
  values: unknown[][];
}

export interface SetFormulaArgs {
  sheetName: string;
  address: string;
  formula: string;
}

export interface CreateChartArgs {
  sheetName: string;
  sourceAddress: string;
  chartType: ChartType;
  destinationAddress?: string;
  title?: string;
  width?: number;
  height?: number;
}

export type ChartType =
  | 'columnClustered'
  | 'columnStacked'
  | 'barClustered'
  | 'barStacked'
  | 'line'
  | 'lineMarkers'
  | 'pie'
  | 'doughnut'
  | 'area'
  | 'scatter'
  | 'bubble';

export interface CreatePivotTableArgs {
  pivotName: string;
  sourceAddressOrTable: string;
  destinationSheet: string;
  destinationCell: string;
  rows?: string[];
  columns?: string[];
  values?: PivotValueField[];
  filters?: string[];
}

export interface PivotValueField {
  field: string;
  summarizeBy?: 'sum' | 'count' | 'average' | 'max' | 'min';
  name?: string;
}

export interface FormatRangeArgs {
  sheetName: string;
  address: string;
  format: FormatSpec;
}

export interface FormatSpec {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  numberFormat?: string;
  horizontalAlignment?: 'left' | 'center' | 'right';
  verticalAlignment?: 'top' | 'middle' | 'bottom';
  borders?: BorderSpec;
  wrapText?: boolean;
}

export interface BorderSpec {
  top?: BorderStyle;
  bottom?: BorderStyle;
  left?: BorderStyle;
  right?: BorderStyle;
  all?: BorderStyle;
}

export interface BorderStyle {
  style?: 'thin' | 'medium' | 'thick' | 'dashed' | 'dotted' | 'double';
  color?: string;
}

export interface AddNamedRangeArgs {
  name: string;
  sheetName: string;
  address: string;
}

// Tool result types

export interface WorkbookSchema {
  name: string;
  sheets: SheetSchema[];
  namedRanges: NamedRangeInfo[];
  activeSheet: string;
  activeSelection?: string;
}

export interface SheetSchema {
  name: string;
  usedRange?: string;
  tables: TableInfo[];
  charts: ChartInfo[];
  pivotTables: PivotTableInfo[];
}

export interface TableInfo {
  name: string;
  address: string;
  headerRow: string[];
  rowCount: number;
}

export interface ChartInfo {
  name: string;
  type: string;
  dataRange?: string;
}

export interface PivotTableInfo {
  name: string;
  sourceRange?: string;
}

export interface NamedRangeInfo {
  name: string;
  address: string;
  sheetName: string;
}

export interface RangeValues {
  address: string;
  values: unknown[][];
  rowCount: number;
  columnCount: number;
  sampled: boolean;
  totalCells: number;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  artifactId?: string;
}

// All tool args union
export type ToolArgs =
  | GetWorkbookSchemaArgs
  | GetRangeValuesArgs
  | CreateSheetArgs
  | EnsureTableArgs
  | WriteRangeArgs
  | SetFormulaArgs
  | CreateChartArgs
  | CreatePivotTableArgs
  | FormatRangeArgs
  | AddNamedRangeArgs;

// Tool name literals
export type ToolName =
  | 'getWorkbookSchema'
  | 'getRangeValues'
  | 'createSheet'
  | 'ensureTable'
  | 'writeRange'
  | 'setFormula'
  | 'createChart'
  | 'createPivotTable'
  | 'formatRange'
  | 'addNamedRange';

// Tool definitions for LLM
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'getWorkbookSchema',
    description: 'Get the structure of the workbook including sheets, tables, named ranges, pivots, charts, and active selection.',
    riskLevel: 'read',
    parameters: [
      { name: 'includeFormulas', type: 'boolean', description: 'Include formula information', required: false, default: false },
      { name: 'includeCharts', type: 'boolean', description: 'Include chart information', required: false, default: true },
      { name: 'includePivots', type: 'boolean', description: 'Include pivot table information', required: false, default: true },
    ],
  },
  {
    name: 'getRangeValues',
    description: 'Read values from a range of cells. Use maxCells to limit large ranges.',
    riskLevel: 'read',
    parameters: [
      { name: 'sheetName', type: 'string', description: 'Name of the worksheet', required: true },
      { name: 'address', type: 'string', description: 'Cell address or range (e.g., "A1:D10")', required: true },
      { name: 'maxCells', type: 'number', description: 'Maximum cells to return (samples if exceeded)', required: false, default: 1000 },
    ],
  },
  {
    name: 'createSheet',
    description: 'Create a new worksheet in the workbook.',
    riskLevel: 'write',
    parameters: [
      { name: 'name', type: 'string', description: 'Name for the new sheet', required: true },
      { name: 'position', type: 'string', description: 'Position: "end", "beginning", or index number', required: false, default: 'end' },
    ],
  },
  {
    name: 'ensureTable',
    description: 'Create a table from a range, or return existing table if already defined.',
    riskLevel: 'write',
    parameters: [
      { name: 'sheetName', type: 'string', description: 'Name of the worksheet', required: true },
      { name: 'addressOrUsedRange', type: 'string', description: 'Range address or "usedRange"', required: true },
      { name: 'tableName', type: 'string', description: 'Name for the table', required: true },
      { name: 'hasHeaders', type: 'boolean', description: 'First row contains headers', required: false, default: true },
    ],
  },
  {
    name: 'writeRange',
    description: 'Write values to a range of cells. Values must be a 2D array.',
    riskLevel: 'write',
    parameters: [
      { name: 'sheetName', type: 'string', description: 'Name of the worksheet', required: true },
      { name: 'address', type: 'string', description: 'Starting cell address (e.g., "A1")', required: true },
      { name: 'values', type: 'array', description: '2D array of values to write', required: true },
    ],
  },
  {
    name: 'setFormula',
    description: 'Set a formula in a cell or range.',
    riskLevel: 'write',
    parameters: [
      { name: 'sheetName', type: 'string', description: 'Name of the worksheet', required: true },
      { name: 'address', type: 'string', description: 'Cell address', required: true },
      { name: 'formula', type: 'string', description: 'Formula starting with =', required: true },
    ],
  },
  {
    name: 'createChart',
    description: 'Create a chart from data in a range.',
    riskLevel: 'write',
    parameters: [
      { name: 'sheetName', type: 'string', description: 'Sheet containing the data', required: true },
      { name: 'sourceAddress', type: 'string', description: 'Data range for the chart', required: true },
      { name: 'chartType', type: 'string', description: 'Chart type (e.g., "columnClustered", "line", "pie")', required: true },
      { name: 'destinationAddress', type: 'string', description: 'Where to place the chart', required: false },
      { name: 'title', type: 'string', description: 'Chart title', required: false },
      { name: 'width', type: 'number', description: 'Chart width in pixels', required: false, default: 500 },
      { name: 'height', type: 'number', description: 'Chart height in pixels', required: false, default: 300 },
    ],
  },
  {
    name: 'createPivotTable',
    description: 'Create a pivot table from a data range or table.',
    riskLevel: 'write',
    parameters: [
      { name: 'pivotName', type: 'string', description: 'Name for the pivot table', required: true },
      { name: 'sourceAddressOrTable', type: 'string', description: 'Source data range or table name', required: true },
      { name: 'destinationSheet', type: 'string', description: 'Sheet for the pivot table', required: true },
      { name: 'destinationCell', type: 'string', description: 'Cell address for pivot placement', required: true },
      { name: 'rows', type: 'array', description: 'Fields for row labels', required: false },
      { name: 'columns', type: 'array', description: 'Fields for column labels', required: false },
      { name: 'values', type: 'array', description: 'Value fields with summarization', required: false },
      { name: 'filters', type: 'array', description: 'Filter fields', required: false },
    ],
  },
  {
    name: 'formatRange',
    description: 'Apply formatting to a range of cells.',
    riskLevel: 'write',
    parameters: [
      { name: 'sheetName', type: 'string', description: 'Name of the worksheet', required: true },
      { name: 'address', type: 'string', description: 'Cell or range address', required: true },
      { name: 'format', type: 'object', description: 'Format specification (bold, fontSize, colors, etc.)', required: true },
    ],
  },
  {
    name: 'addNamedRange',
    description: 'Create a named range for easy reference.',
    riskLevel: 'write',
    parameters: [
      { name: 'name', type: 'string', description: 'Name for the range (must be valid Excel name)', required: true },
      { name: 'sheetName', type: 'string', description: 'Sheet containing the range', required: true },
      { name: 'address', type: 'string', description: 'Range address', required: true },
    ],
  },
];
