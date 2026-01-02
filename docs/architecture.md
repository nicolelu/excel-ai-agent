# Excel AI Assistant - Architecture Document

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Tool Layer Implementation](#tool-layer-implementation)
- [Plan/Apply Workflow](#planapply-workflow)
- [Idempotency & Reconciliation](#idempotency--reconciliation)
- [Provider Adapters](#provider-adapters)
- [Safety Guardrails](#safety-guardrails)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Performance Targets](#performance-targets)
- [Future Enhancements](#future-enhancements)

---

## Overview

The Excel AI Assistant is an Office Add-in that provides a Cursor-like chat interface for Excel. Users interact via a task pane sidebar, selecting an AI model and issuing natural language commands. The assistant plans and executes Excel operations using a deterministic tool layer—never generating raw Office.js code.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Excel Desktop                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Task Pane (React)                         ││
│  │  ┌─────────────┐  ┌─────────────────────────────────────┐   ││
│  │  │Model Selector│  │         Chat Interface              │   ││
│  │  └─────────────┘  │  - Message history                   │   ││
│  │                    │  - Plan preview                      │   ││
│  │  ┌─────────────┐  │  - Apply progress                    │   ││
│  │  │Context Scope│  │  - Tool execution feedback           │   ││
│  │  └─────────────┘  └─────────────────────────────────────┘   ││
│  │                                                              ││
│  │  ┌──────────────────────────────────────────────────────┐   ││
│  │  │               Excel Tool Layer                        │   ││
│  │  │  getWorkbookSchema | writeRange | createChart | ...   │   ││
│  │  └──────────────────────────────────────────────────────┘   ││
│  │                           │                                  ││
│  │  ┌──────────────────────────────────────────────────────┐   ││
│  │  │            Idempotency Ledger (IndexedDB)             │   ││
│  │  └──────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Gateway (Express)                       │
│  ┌─────────────────┐  ┌─────────────────────────────────────┐   │
│  │  GET /models    │  │  POST /chat                          │   │
│  │  Model Catalog  │  │  - Validates request                 │   │
│  └─────────────────┘  │  - Routes to provider adapter        │   │
│                       │  - Manages tool-call loop            │   │
│  ┌─────────────────┐  └─────────────────────────────────────┘   │
│  │ models.json     │                    │                        │
│  │ (config)        │                    ▼                        │
│  └─────────────────┘  ┌─────────────────────────────────────┐   │
│                       │         Provider Adapters            │   │
│                       │  ┌─────────┐ ┌─────────┐ ┌─────────┐│   │
│                       │  │ OpenAI  │ │Anthropic│ │ Google  ││   │
│                       │  └─────────┘ └─────────┘ └─────────┘│   │
│                       └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Add-in Task Pane (`/addin`)

**Technology**: React 18, TypeScript, Office.js, IndexedDB

**Key Components**:
- `App.tsx` - Root component with context providers
- `ChatInterface.tsx` - Main chat UI with message history
- `ModelSelector.tsx` - Dynamic model dropdown from /models
- `PlanPreview.tsx` - Displays planned operations for approval
- `ApplyProgress.tsx` - Shows step-by-step execution progress
- `ContextScopeSelector.tsx` - Selection/sheet/table scoping

**Services**:
- `apiService.ts` - Gateway communication (models, chat)
- `storageService.ts` - Office.storage for model preference
- `ledgerService.ts` - IndexedDB for idempotency tracking

### 2. Excel Tool Layer (`/addin/src/tools`)

Deterministic, schema-validated tools that wrap Office.js:

| Tool | Description | Risk Level |
|------|-------------|------------|
| `getWorkbookSchema` | Returns workbook structure | Read |
| `getRangeValues` | Reads cell values (with sampling) | Read |
| `createSheet` | Creates new worksheet | Write |
| `ensureTable` | Creates or finds existing table | Write |
| `writeRange` | Writes values to cells | Write |
| `setFormula` | Sets formula in cell/range | Write |
| `createChart` | Creates chart from data | Write |
| `createPivotTable` | Creates pivot table | Write |
| `formatRange` | Applies formatting | Write |
| `addNamedRange` | Defines named range | Write |

**Performance Optimizations**:
- Batch all operations before `context.sync()`
- Use `context.application.suspendApiCalculationUntilNextSync()` for bulk writes
- Limit data reads with `maxCells` parameter
- Schema compression for LLM context

### 3. LLM Gateway (`/server`)

**Technology**: Node.js, Express, TypeScript

**Endpoints**:
- `GET /health` - Health check
- `GET /models` - Returns enabled models from catalog
- `POST /chat` - Handles chat with tool-calling loop

**Provider Adapter Interface**:
```typescript
interface LLMProvider {
  id: string;
  chat(request: ChatRequest): AsyncGenerator<ChatResponse>;
  supportsToolCalling: boolean;
}
```

**Tool-Calling Protocol**:
```
Client                      Server                      LLM
  │                           │                           │
  ├──POST /chat (plan mode)──►│                           │
  │                           ├──────chat request────────►│
  │                           │◄─────tool_call────────────┤
  │◄────tool_call response────┤                           │
  ├────tool_result────────────►│                           │
  │                           ├──────with result──────────►│
  │                           │◄─────final response───────┤
  │◄────final + plan──────────┤                           │
```

### 4. Shared Types (`/shared`)

Common TypeScript types used by both add-in and server:
- `Tool.ts` - Tool definitions and argument schemas
- `Plan.ts` - Plan step structure
- `Message.ts` - Chat message types
- `Model.ts` - Model catalog types
- `ToolCall.ts` - Tool-calling protocol types

## Plan/Apply Workflow

### Plan Phase
1. User sends message with `mode: "plan"`
2. LLM analyzes workbook schema and request
3. LLM generates structured plan (no writes)
4. Plan returned to client for preview

### Apply Phase
1. User approves plan, sends `mode: "apply"` with plan
2. Server streams step execution
3. Client executes each tool, returns results
4. Progress updates shown in UI
5. Final summary with change log

### Plan Step Schema
```typescript
interface PlanStep {
  id: string;
  description: string;
  toolName: string;
  args: Record<string, unknown>;
  expectedEffect: string;
  riskLevel: 'read' | 'write' | 'destructive';
  preconditions: string[];
  postconditions: string[];
}
```

## Idempotency & Reconciliation

**Ledger Schema** (IndexedDB):
```typescript
interface LedgerEntry {
  id: string;
  workbookFingerprint: string;  // name + hash(sheetNames)
  actionType: string;
  normalizedArgs: string;       // JSON.stringify(sorted args)
  artifactId: string;           // Created sheet/chart/pivot ID
  createdAt: number;
  lastVerifiedAt: number;
}
```

**Collision Avoidance**:
- Before creating sheet/chart/pivot/table: query ledger
- If exists: return reference to existing artifact
- If name conflict but different args: append suffix (e.g., "Chart 1 (2)")

## Safety Guardrails

### MVP Restrictions
- **No delete operations** (sheets, ranges, charts)
- **No destructive overwrites** without confirmation
- Write operations require plan approval

### Collision Detection
1. Check target range for existing data
2. If non-empty:
   - Option A: Prompt user for confirmation
   - Option B: Auto-select safe alternate destination
3. Name collisions handled with suffix

### Data Sampling
- `getRangeValues` limits to `maxCells` (default 1000)
- Schema compression for large workbooks
- Token estimation before LLM call

## Configuration

### Model Catalog (`/server/config/models.json`)
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
    }
  ]
}
```

### Environment Variables
```bash
# Server
PORT=3001
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Add-in
VITE_API_URL=http://localhost:3001
```

## Error Handling

### Client-Side
- Graceful fallback if no enabled models
- Retry logic for transient network errors
- Clear error messages with recovery suggestions

### Server-Side
- Request validation with Zod schemas
- Provider-specific error mapping
- Rate limit handling with backoff

### Tool Execution
- Pre-condition validation before execution
- Rollback tracking (log operations for potential undo)
- Detailed error context for debugging

## Testing Strategy

### Unit Tests
- Tool argument validation
- Schema compression
- Ledger operations
- Provider adapter message formatting

### Integration Tests
- /models endpoint
- /chat endpoint with mock provider
- Full tool-call loop

### E2E Tests (Manual)
- Sideload add-in
- Execute MVP tasks
- Verify workbook state

## Security Considerations

- API keys never exposed to client
- Server validates all tool arguments
- No arbitrary code execution
- Office.js sandbox isolation

## Performance Targets

- Model list load: < 500ms
- Plan generation: < 5s for simple tasks
- Tool execution: < 1s per tool (excluding LLM calls)
- UI responsiveness: 60fps during operations

## Data Flow

### Request Lifecycle

```
1. User Input
   │
   ├─► User types message in chat interface
   │
2. Context Collection
   │
   ├─► useWorkbookSchema() gathers workbook structure
   ├─► Selection context captured if scope allows
   │
3. API Request
   │
   ├─► apiService.chat() sends to gateway
   │   POST /api/chat with:
   │   - modelId, messages, workbookSchema
   │   - selectionContext, mode, contextScope
   │
4. Server Processing
   │
   ├─► Zod validates request
   ├─► chatService routes to provider adapter
   ├─► Adapter formats for LLM API
   │
5. LLM Response
   │
   ├─► LLM returns text and/or tool calls
   ├─► If tool calls: execute and continue
   ├─► If plan: return structured ExecutionPlan
   │
6. Client Execution
   │
   ├─► PlanPreview shows steps for approval
   ├─► On approve: execute tools via Office.js
   ├─► Ledger records artifacts for idempotency
   │
7. Completion
   │
   └─► Success message with change log
```

### Tool Calling Flow

```typescript
// 1. LLM returns tool_call
{
  type: 'tool_call',
  callId: 'call_123',
  toolName: 'createChart',
  args: { sheetName: 'Sheet1', dataRange: 'A1:D10', chartType: 'Bar' }
}

// 2. Client executes tool
const result = await excelTools.createChart(args);

// 3. Client sends result back
POST /api/chat/continue
{
  toolResults: [{ callId: 'call_123', result: { success: true, ... } }]
}

// 4. LLM continues with result context
```

---

## Tool Layer Implementation

### Tool Registry (`addin/src/tools/index.ts`)

Each tool follows this pattern:

```typescript
export async function createChart(args: CreateChartArgs): Promise<ToolResult> {
  return Excel.run(async (context) => {
    // 1. Get references
    const sheet = context.workbook.worksheets.getItem(args.sheetName);

    // 2. Create artifact
    const chart = sheet.charts.add(
      args.chartType as Excel.ChartType,
      sheet.getRange(args.dataRange)
    );

    // 3. Configure
    if (args.title) {
      chart.title.text = args.title;
    }

    // 4. Position
    if (args.position) {
      const anchor = sheet.getCell(args.position.row, args.position.col);
      chart.setPosition(anchor);
    }

    // 5. Sync and return
    chart.load('name');
    await context.sync();

    return {
      success: true,
      data: { chartName: chart.name },
      artifactId: chart.name
    };
  });
}
```

### Performance Optimizations

```typescript
// Batch operations before sync
context.application.suspendApiCalculationUntilNextSync();

// Load only needed properties
sheet.load('name,usedRange/address');

// Use getRange() with specific addresses
const range = sheet.getRange('A1:D10');
range.load('values');
await context.sync(); // Single sync for all loads
```

---

## Provider Adapters

### Adapter Interface

```typescript
interface LLMAdapter {
  id: string;
  supportsToolCalling: boolean;

  chat(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    options: ChatOptions
  ): Promise<ChatResponse>;
}
```

### OpenAI Adapter (`server/src/adapters/openaiAdapter.ts`)

```typescript
// Message format conversion
const openaiMessages = messages.map(m => ({
  role: m.role,
  content: m.content
}));

// Tool format
const openaiTools = tools.map(t => ({
  type: 'function',
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters
  }
}));

// API call
const response = await openai.chat.completions.create({
  model: modelId,
  messages: openaiMessages,
  tools: openaiTools,
  temperature: options.temperature
});
```

### Anthropic Adapter (`server/src/adapters/anthropicAdapter.ts`)

```typescript
// Tool format for Claude
const anthropicTools = tools.map(t => ({
  name: t.name,
  description: t.description,
  input_schema: t.parameters
}));

// API call
const response = await anthropic.messages.create({
  model: modelId,
  messages: anthropicMessages,
  tools: anthropicTools,
  max_tokens: 4096
});

// Handle tool_use blocks
for (const block of response.content) {
  if (block.type === 'tool_use') {
    // Extract tool call
  }
}
```

### Google Adapter (`server/src/adapters/googleAdapter.ts`)

```typescript
// Function declaration format
const googleFunctions = tools.map(t => ({
  name: t.name,
  description: t.description,
  parameters: t.parameters
}));

// API call with function calling
const response = await model.generateContent({
  contents: googleContents,
  tools: [{ functionDeclarations: googleFunctions }]
});

// Handle function calls in response
for (const part of response.candidates[0].content.parts) {
  if ('functionCall' in part && part.functionCall) {
    // Extract function call
  }
}
```

---

## Future Enhancements

### v1.1 Planned
1. **Undo/Redo** - Track operations for reversal
2. **More Chart Types** - Expanded visualization options
3. **Formula Mode** - Explain and generate formulas
4. **Keyboard Shortcuts** - Power user efficiency

### v2.0 Roadmap
1. **Templates** - Pre-built templates for common tasks
2. **Collaboration** - Multi-user sessions
3. **Enterprise** - SSO, audit logging, compliance
4. **Offline** - Queue operations for later sync
5. **Custom Tools** - User-defined tool extensions
6. **Cross-Workbook** - Operations across files
