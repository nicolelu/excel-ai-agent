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
export type ChartType = 'columnClustered' | 'columnStacked' | 'barClustered' | 'barStacked' | 'line' | 'lineMarkers' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'bubble';
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
export type ToolArgs = GetWorkbookSchemaArgs | GetRangeValuesArgs | CreateSheetArgs | EnsureTableArgs | WriteRangeArgs | SetFormulaArgs | CreateChartArgs | CreatePivotTableArgs | FormatRangeArgs | AddNamedRangeArgs;
export type ToolName = 'getWorkbookSchema' | 'getRangeValues' | 'createSheet' | 'ensureTable' | 'writeRange' | 'setFormula' | 'createChart' | 'createPivotTable' | 'formatRange' | 'addNamedRange';
export declare const TOOL_DEFINITIONS: ToolDefinition[];
//# sourceMappingURL=tool.d.ts.map