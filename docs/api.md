# API Documentation

This document describes the REST API provided by the Excel AI Assistant gateway server.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: Your deployed server URL

## Authentication

Currently, the API does not require authentication. API keys for LLM providers are configured server-side via environment variables.

> **Note**: For production deployments, consider adding API key or JWT authentication.

---

## Endpoints

### Health Check

#### `GET /health`

Returns server health status.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

**Status Codes**:
- `200 OK`: Server is healthy

---

### Models

#### `GET /models`

Returns the list of enabled AI models.

**Response**:
```json
{
  "models": [
    {
      "id": "gpt-4o",
      "label": "GPT-4o",
      "provider": "openai",
      "family": "gpt-4",
      "supportsToolCalling": true,
      "defaultTemperature": 0.7,
      "enabled": true
    },
    {
      "id": "claude-3-5-sonnet-20241022",
      "label": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "family": "claude-3",
      "supportsToolCalling": true,
      "defaultTemperature": 0.7,
      "enabled": true
    }
  ],
  "defaultModelId": "gpt-4o"
}
```

**Model Object Properties**:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique model identifier |
| `label` | string | Display name for UI |
| `provider` | string | Provider name: `openai`, `anthropic`, `google` |
| `family` | string | Model family for grouping |
| `supportsToolCalling` | boolean | Whether model supports function/tool calling |
| `defaultTemperature` | number | Default temperature (0-1) |
| `enabled` | boolean | Whether model is available |

**Status Codes**:
- `200 OK`: Success
- `500 Internal Server Error`: Failed to load models

---

#### `POST /models/refresh`

Forces a refresh of the model catalog from configuration.

**Response**:
```json
{
  "success": true,
  "models": [...]
}
```

**Status Codes**:
- `200 OK`: Models refreshed
- `500 Internal Server Error`: Refresh failed

---

### Chat

#### `POST /chat`

Main chat endpoint for LLM conversations with tool calling support.

**Request Body**:
```json
{
  "modelId": "gpt-4o",
  "messages": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "Create a bar chart from the data in A1:D10",
      "timestamp": 1705312200000
    }
  ],
  "workbookSchema": {
    "sheets": [
      {
        "name": "Sheet1",
        "usedRange": "A1:D10",
        "tables": [],
        "charts": [],
        "pivotTables": []
      }
    ]
  },
  "selectionContext": {
    "sheetName": "Sheet1",
    "address": "A1:D10",
    "values": [["Header1", "Header2"], ["Value1", "Value2"]]
  },
  "mode": "plan",
  "contextScope": "workbook"
}
```

**Request Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `modelId` | string | Yes | Model ID to use |
| `messages` | ChatMessage[] | Yes | Conversation history |
| `workbookSchema` | WorkbookSchema | Yes | Current workbook structure |
| `selectionContext` | SelectionContext | No | Current selection details |
| `mode` | `"plan"` \| `"apply"` | Yes | Operation mode |
| `contextScope` | `"selection"` \| `"sheet"` \| `"workbook"` | Yes | Context scope |

**ChatMessage Object**:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique message ID |
| `role` | `"user"` \| `"assistant"` \| `"system"` | Message role |
| `content` | string | Message content |
| `timestamp` | number | Unix timestamp in milliseconds |
| `metadata` | object | Optional metadata (token usage, etc.) |

**WorkbookSchema Object**:

| Property | Type | Description |
|----------|------|-------------|
| `sheets` | SheetSchema[] | Array of sheet schemas |

**SheetSchema Object**:

| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Sheet name |
| `usedRange` | string | Used range address (e.g., "A1:Z100") |
| `tables` | TableInfo[] | Tables in the sheet |
| `charts` | ChartInfo[] | Charts in the sheet |
| `pivotTables` | PivotTableInfo[] | Pivot tables in the sheet |

**Response** (Success):
```json
{
  "success": true,
  "response": [
    {
      "type": "text",
      "content": "I'll create a bar chart from your data."
    },
    {
      "type": "plan",
      "plan": {
        "id": "plan_001",
        "steps": [
          {
            "id": "step_001",
            "description": "Create bar chart from A1:D10",
            "toolName": "createChart",
            "args": {
              "sheetName": "Sheet1",
              "dataRange": "A1:D10",
              "chartType": "ColumnClustered",
              "title": "Data Chart"
            },
            "expectedEffect": "Creates a clustered column chart",
            "riskLevel": "write"
          }
        ],
        "summary": "Create a bar chart visualization"
      }
    },
    {
      "type": "final",
      "message": "I've prepared a plan to create the chart. Review and click Apply to proceed.",
      "tokenUsage": {
        "prompt": 450,
        "completion": 120,
        "total": 570
      }
    }
  ],
  "plan": {
    "id": "plan_001",
    "steps": [...]
  }
}
```

**Response Chunk Types**:

| Type | Description |
|------|-------------|
| `text` | Text content from the LLM |
| `plan` | Execution plan for approval |
| `tool_call` | Tool invocation request |
| `final` | Final response with token usage |
| `error` | Error message |

**Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Processing failed

---

#### `POST /chat/continue`

Continues a conversation after tool execution results are available.

**Request Body**:
```json
{
  "modelId": "gpt-4o",
  "messages": [...],
  "workbookSchema": {...},
  "selectionContext": {...},
  "mode": "plan",
  "contextScope": "workbook",
  "toolResults": [
    {
      "callId": "call_001",
      "result": {
        "success": true,
        "data": {
          "chartId": "Chart1",
          "chartName": "Data Chart"
        },
        "artifactId": "Chart1"
      }
    }
  ]
}
```

**Additional Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `toolResults` | ToolResultPair[] | Yes | Results from tool execution |

**ToolResultPair Object**:

| Property | Type | Description |
|----------|------|-------------|
| `callId` | string | ID of the tool call being responded to |
| `result` | ToolResult | Tool execution result |

**ToolResult Object**:

| Property | Type | Description |
|----------|------|-------------|
| `success` | boolean | Whether execution succeeded |
| `data` | any | Result data (if success) |
| `error` | string | Error message (if failed) |
| `artifactId` | string | ID of created artifact (optional) |

**Response**: Same as `POST /api/chat`

---

## Tool Definitions

The following tools are available for the LLM to call:

### `getWorkbookSchema`

Get the current workbook structure.

**Arguments**: None

**Returns**:
```json
{
  "success": true,
  "data": {
    "sheets": [...]
  }
}
```

---

### `getRangeValues`

Read values from a cell range.

**Arguments**:
```json
{
  "sheetName": "Sheet1",
  "range": "A1:D10",
  "maxCells": 1000
}
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `sheetName` | string | Yes | Target sheet name |
| `range` | string | Yes | Range address (e.g., "A1:D10") |
| `maxCells` | number | No | Maximum cells to read (default: 1000) |

**Returns**:
```json
{
  "success": true,
  "data": {
    "values": [["A1", "B1"], ["A2", "B2"]],
    "address": "A1:D10",
    "rowCount": 10,
    "columnCount": 4
  }
}
```

---

### `createSheet`

Create a new worksheet.

**Arguments**:
```json
{
  "name": "New Sheet",
  "position": "end"
}
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Sheet name |
| `position` | `"start"` \| `"end"` \| number | No | Position for new sheet |

**Returns**:
```json
{
  "success": true,
  "data": {
    "sheetName": "New Sheet",
    "sheetId": "sheet_001"
  },
  "artifactId": "New Sheet"
}
```

---

### `ensureTable`

Create a table or return existing one.

**Arguments**:
```json
{
  "sheetName": "Sheet1",
  "range": "A1:D10",
  "name": "SalesTable",
  "hasHeaders": true
}
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `sheetName` | string | Yes | Target sheet |
| `range` | string | Yes | Data range |
| `name` | string | Yes | Table name |
| `hasHeaders` | boolean | No | Whether first row is headers (default: true) |

**Returns**:
```json
{
  "success": true,
  "data": {
    "tableName": "SalesTable",
    "tableId": "table_001",
    "alreadyExists": false
  },
  "artifactId": "SalesTable"
}
```

---

### `writeRange`

Write values to a cell range.

**Arguments**:
```json
{
  "sheetName": "Sheet1",
  "startCell": "A1",
  "values": [["Header1", "Header2"], ["Value1", "Value2"]]
}
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `sheetName` | string | Yes | Target sheet |
| `startCell` | string | Yes | Top-left cell address |
| `values` | any[][] | Yes | 2D array of values |

**Returns**:
```json
{
  "success": true,
  "data": {
    "address": "A1:B2",
    "rowCount": 2,
    "columnCount": 2
  }
}
```

---

### `setFormula`

Set a formula in a cell or range.

**Arguments**:
```json
{
  "sheetName": "Sheet1",
  "cell": "A10",
  "formula": "=SUM(A1:A9)"
}
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `sheetName` | string | Yes | Target sheet |
| `cell` | string | Yes | Cell address |
| `formula` | string | Yes | Formula string (with = prefix) |

**Returns**:
```json
{
  "success": true,
  "data": {
    "address": "A10",
    "formula": "=SUM(A1:A9)"
  }
}
```

---

### `createChart`

Create a chart from data.

**Arguments**:
```json
{
  "sheetName": "Sheet1",
  "dataRange": "A1:D10",
  "chartType": "ColumnClustered",
  "title": "Sales Chart",
  "position": {
    "row": 12,
    "col": 1
  }
}
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `sheetName` | string | Yes | Target sheet |
| `dataRange` | string | Yes | Data source range |
| `chartType` | ChartType | Yes | Chart type (see below) |
| `title` | string | No | Chart title |
| `position` | {row, col} | No | Chart position |

**Chart Types**: `ColumnClustered`, `ColumnStacked`, `BarClustered`, `BarStacked`, `Line`, `LineMarkers`, `Pie`, `Area`, `XYScatter`

**Returns**:
```json
{
  "success": true,
  "data": {
    "chartName": "Chart 1",
    "chartId": "chart_001"
  },
  "artifactId": "Chart 1"
}
```

---

### `createPivotTable`

Create a pivot table.

**Arguments**:
```json
{
  "sourceSheetName": "Data",
  "sourceRange": "A1:E100",
  "destinationSheetName": "Pivot",
  "destinationCell": "A1",
  "name": "SalesPivot",
  "rowFields": ["Region", "Product"],
  "columnFields": ["Year"],
  "valueFields": [
    {"field": "Revenue", "aggregation": "sum"}
  ]
}
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `sourceSheetName` | string | Yes | Data source sheet |
| `sourceRange` | string | Yes | Data range |
| `destinationSheetName` | string | Yes | Destination sheet |
| `destinationCell` | string | Yes | Top-left cell for pivot |
| `name` | string | Yes | Pivot table name |
| `rowFields` | string[] | No | Row field names |
| `columnFields` | string[] | No | Column field names |
| `valueFields` | ValueField[] | No | Value fields with aggregation |

**Returns**:
```json
{
  "success": true,
  "data": {
    "pivotTableName": "SalesPivot",
    "pivotTableId": "pivot_001"
  },
  "artifactId": "SalesPivot"
}
```

---

### `formatRange`

Apply formatting to a range.

**Arguments**:
```json
{
  "sheetName": "Sheet1",
  "range": "A1:D1",
  "format": {
    "bold": true,
    "fillColor": "#4472C4",
    "fontColor": "#FFFFFF",
    "fontSize": 12,
    "horizontalAlignment": "center",
    "borders": {
      "style": "thin",
      "color": "#000000"
    }
  }
}
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `sheetName` | string | Yes | Target sheet |
| `range` | string | Yes | Range to format |
| `format` | FormatOptions | Yes | Formatting options |

**FormatOptions**:

| Property | Type | Description |
|----------|------|-------------|
| `bold` | boolean | Bold text |
| `italic` | boolean | Italic text |
| `underline` | boolean | Underline text |
| `fillColor` | string | Background color (hex) |
| `fontColor` | string | Font color (hex) |
| `fontSize` | number | Font size in points |
| `horizontalAlignment` | string | `left`, `center`, `right` |
| `verticalAlignment` | string | `top`, `center`, `bottom` |
| `numberFormat` | string | Number format string |
| `borders` | BorderOptions | Border settings |

**Returns**:
```json
{
  "success": true,
  "data": {
    "address": "A1:D1"
  }
}
```

---

### `addNamedRange`

Define a named range.

**Arguments**:
```json
{
  "name": "SalesData",
  "sheetName": "Sheet1",
  "range": "A1:D100"
}
```

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Name for the range |
| `sheetName` | string | Yes | Sheet containing range |
| `range` | string | Yes | Range address |

**Returns**:
```json
{
  "success": true,
  "data": {
    "name": "SalesData",
    "address": "Sheet1!A1:D100"
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

| HTTP Status | Meaning |
|-------------|---------|
| `400 Bad Request` | Invalid request body or parameters |
| `404 Not Found` | Endpoint not found |
| `500 Internal Server Error` | Server-side processing error |

### Validation Errors

Request validation uses Zod schemas. Validation errors return:

```json
{
  "success": false,
  "error": "Validation failed: modelId is required"
}
```

---

## Rate Limiting

Currently no rate limiting is implemented. For production:
- Consider implementing per-IP or per-user rate limits
- LLM providers have their own rate limits

---

## CORS

By default, CORS is configured to allow all origins (`*`).

For production, set `CORS_ORIGIN` environment variable to restrict to known origins:

```bash
CORS_ORIGIN=https://your-addin-domain.com
```
