# Excel AI Assistant

A Cursor-like AI-powered Office Add-in for Excel. Chat with AI to create and modify your Excel workbooks using natural language.

## Table of Contents

- [Goals \& Requirements](#goals--requirements)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Available Tools](#available-tools)
- [MVP Tasks](#mvp-tasks)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Goals & Requirements

### Vision

Create a powerful AI assistant for Excel that brings Cursor-like intelligence to spreadsheet workflows. Users should be able to describe what they want in natural language and have the AI safely execute complex Excel operations.

### Core Requirements

1. **Multi-Model Support**: Support multiple LLM providers (OpenAI, Anthropic, Google) with easy switching
2. **Safe Execution**: Plan/Apply workflow ensures users preview changes before execution
3. **Deterministic Tools**: No arbitrary code generation - only predefined, auditable Excel operations
4. **Idempotency**: Track operations to prevent duplicate creations and handle retries gracefully
5. **Context Control**: Users decide what data the AI can access (selection, sheet, or workbook)
6. **Enterprise Ready**: Audit logging, security isolation, and extensible architecture

### Non-Goals (MVP)

- Real-time collaboration
- Arbitrary VBA/macro execution
- Cross-workbook operations
- Undo/redo support (planned for v2)

---

## Features

| Feature | Description | Status |
|---------|-------------|--------|
| **AI Chat Interface** | Natural language interaction with spreadsheets | Implemented |
| **Multi-Model Support** | OpenAI, Anthropic (Claude), Google (Gemini) | Implemented |
| **Plan/Apply Workflow** | Preview changes before execution | Implemented |
| **Deterministic Tools** | 10 safe, auditable Excel operations | Implemented |
| **Idempotency Ledger** | Prevents duplicate operations | Implemented |
| **Context Scoping** | Control what data AI can see | Implemented |
| **Template Library** | Quick-start templates for common tasks | Implemented |
| **Token Estimation** | Cost awareness before execution | Implemented |

---

## Architecture

### High-Level Overview

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
│  │  │               Excel Tool Layer (Office.js)            │   ││
│  │  └──────────────────────────────────────────────────────┘   ││
│  │  ┌──────────────────────────────────────────────────────┐   ││
│  │  │            Idempotency Ledger (IndexedDB)             │   ││
│  │  └──────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────┘│
│                              │ HTTPS                             │
└──────────────────────────────┼───────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      LLM Gateway (Express)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  GET /api/models    POST /api/chat    POST /api/chat/continue│
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Provider Adapters: OpenAI | Anthropic | Google   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Project Structure

```
excel-ai-agent/
├── addin/                   # Office Add-in (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/      # React UI components
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── PlanPreview.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── hooks/           # React hooks
│   │   │   ├── useChat.ts       # Chat state management
│   │   │   ├── useModels.ts     # Model fetching
│   │   │   └── useWorkbookSchema.ts
│   │   ├── services/        # Client-side services
│   │   │   ├── apiService.ts    # Gateway communication
│   │   │   ├── storageService.ts
│   │   │   └── ledgerService.ts # IndexedDB idempotency
│   │   ├── tools/           # Excel tool implementations
│   │   │   └── index.ts     # 10 Office.js tools
│   │   └── taskpane/        # Entry point
│   │       └── App.tsx
│   ├── manifest.xml         # Office Add-in manifest
│   ├── taskpane.html        # HTML entry point
│   └── vite.config.ts       # Vite configuration
│
├── server/                  # LLM Gateway (Express + TypeScript)
│   ├── src/
│   │   ├── adapters/        # LLM provider adapters
│   │   │   ├── openaiAdapter.ts
│   │   │   ├── anthropicAdapter.ts
│   │   │   └── googleAdapter.ts
│   │   ├── routes/          # API endpoints
│   │   │   ├── models.ts
│   │   │   └── chat.ts
│   │   ├── services/        # Business logic
│   │   │   ├── modelService.ts
│   │   │   ├── chatService.ts
│   │   │   └── templateService.ts
│   │   └── index.ts         # Server entry point
│   ├── config/
│   │   └── models.json      # Model catalog
│   └── .env.example         # Environment template
│
├── shared/                  # Shared TypeScript types
│   └── types/
│       ├── model.ts         # Model catalog types
│       ├── tool.ts          # Tool definitions
│       ├── plan.ts          # Execution plan types
│       ├── message.ts       # Chat message types
│       └── ledger.ts        # Idempotency types
│
├── docs/                    # Documentation
│   ├── architecture.md      # Detailed architecture
│   ├── api.md               # API documentation
│   ├── testing.md           # Testing guide
│   ├── deployment.md        # Deployment guide
│   ├── competitive_analysis.md
│   ├── manual_test_plan.md
│   └── dev_log.md           # Development log
│
├── package.json             # Root workspace config
└── README.md                # This file
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **npm workspaces** | Monorepo management without extra tooling |
| **Vite for add-in** | Fast HMR, modern ESM support |
| **Express for gateway** | Simple, battle-tested HTTP server |
| **IndexedDB for ledger** | Client-side persistence without server state |
| **Zod for validation** | Runtime type safety on server |
| **Office.js** | Official Microsoft API for Excel manipulation |

---

## Quick Start

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **Excel Desktop** (Windows or macOS) - required for add-in testing
- **API key** from at least one provider: OpenAI, Anthropic, or Google

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/excel-ai-agent.git
cd excel-ai-agent

# Install all dependencies
npm run install:all

# Generate SSL certificates for local development
npm run certs
```

### Configuration

1. Create the server environment file:
```bash
cp server/.env.example server/.env
```

2. Add your API key(s) to `server/.env`:
```env
PORT=3001
CORS_ORIGIN=*

# Add at least one API key:
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
GOOGLE_API_KEY=your-google-key-here
```

### Running Locally

1. **Start the server** (Terminal 1):
```bash
npm run dev:server
```
Expected output:
```
Server running on port 3001
Available models: gpt-4o, gpt-4o-mini, claude-3-5-sonnet-20241022, ...
```

2. **Start the add-in dev server** (Terminal 2):
```bash
npm run dev:addin
```
Expected output:
```
VITE v5.x.x ready
Local: https://localhost:3000/
```

3. **Sideload into Excel**:
   - Open Excel Desktop
   - Go to **Insert** > **Get Add-ins** > **Upload My Add-in**
   - Browse to `addin/manifest.xml`
   - Click **Upload**

4. **Use the add-in**:
   - Look for **"AI Chat"** button in the Home tab
   - Click to open the task pane
   - Select a model and start chatting!

---

## Configuration

### Model Catalog

Edit `server/config/models.json` to configure available models:

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

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `CORS_ORIGIN` | CORS allowed origins | `*` |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `GOOGLE_API_KEY` | Google AI API key | - |
| `MODEL_OVERRIDES` | JSON array of model overrides | `[]` |
| `MODEL_{ID}_ENABLED` | Enable/disable specific model | - |

### Model Overrides

Override model settings via environment:

```bash
# Disable a model
MODEL_GPT_4O_ENABLED=false

# Add custom model via JSON
MODEL_OVERRIDES='[{"id":"gpt-4-turbo","label":"GPT-4 Turbo","provider":"openai","family":"gpt-4","supportsToolCalling":true,"enabled":true}]'
```

---

## Usage Guide

### Basic Workflow

1. **Open the add-in** by clicking "AI Chat" in the Home tab
2. **Select a model** from the dropdown
3. **Set context scope** (Selection, Current Sheet, or Entire Workbook)
4. **Type your request** in natural language
5. **Review the plan** that the AI generates
6. **Click "Apply Plan"** to execute, or "Cancel" to abort

### Context Scopes

| Scope | What AI Sees | Best For |
|-------|--------------|----------|
| **Selection Only** | Only selected cells | Quick operations on specific data |
| **Current Sheet** | Active sheet structure + data | Sheet-level operations |
| **Entire Workbook** | All sheets, tables, charts | Cross-sheet operations |

### Example Prompts

```
"Create a bar chart from the data in A1:D10"

"Create a pivot table summarizing sales by region and product"

"Add a new sheet called 'Summary' with totals from Sheet1"

"Format the header row as bold with a blue background"

"Create a 3-statement financial model"
```

---

## Available Tools

The AI can execute these predefined tools:

| Tool | Description | Risk Level |
|------|-------------|------------|
| `getWorkbookSchema` | Get workbook structure (sheets, tables, ranges) | Read |
| `getRangeValues` | Read cell values with optional sampling | Read |
| `createSheet` | Create a new worksheet | Write |
| `ensureTable` | Create or find existing table | Write |
| `writeRange` | Write values to cells | Write |
| `setFormula` | Set formula in cell(s) | Write |
| `createChart` | Create chart from data range | Write |
| `createPivotTable` | Create pivot table | Write |
| `formatRange` | Apply formatting (font, fill, borders) | Write |
| `addNamedRange` | Define a named range | Write |

### Tool Schema Example

```typescript
// createChart tool arguments
{
  "sheetName": "Sales Data",
  "dataRange": "A1:D10",
  "chartType": "ColumnClustered",
  "title": "Monthly Sales",
  "position": { "row": 12, "col": 1 }
}
```

---

## MVP Tasks

The assistant is optimized for these end-to-end tasks:

### 1. Create a Chart
**Prompt**: "Create a chart of the data in the current selection"

**What happens**:
1. AI reads the selected data structure
2. Recommends appropriate chart type
3. Generates plan with `createChart` step
4. On approval, creates chart on the sheet

### 2. Create a Pivot Table
**Prompt**: "Create a pivot table from the data in Sheet1"

**What happens**:
1. AI analyzes data structure
2. Identifies suitable row/column/value fields
3. Creates table if needed (`ensureTable`)
4. Creates pivot on new sheet (`createPivotTable`)

### 3. 3-Statement Financial Model
**Prompt**: "Create a 3-statement financial model"

**What happens**:
1. Creates 4 sheets: Inputs, Income Statement, Balance Sheet, Cash Flow
2. Sets up structured layouts with headers
3. Adds formulas linking sheets together
4. Creates summary calculations

### 4. PE Customer Cube
**Prompt**: "Create a PE customer cube with sample data"

**What happens**:
1. Creates normalized data sheet with customer metrics
2. Sets up dimensional structure (company, period, metric)
3. Creates pivot views for analysis
4. Links data for filtering/slicing

---

## Testing

### Automated Tests

```bash
# Run all server tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- modelService.test.ts
```

### Test Structure

```
server/src/__tests__/
├── services/
│   ├── modelService.test.ts    # Model loading and filtering
│   ├── chatService.test.ts     # Chat processing
│   └── templateService.test.ts # Template generation
├── routes/
│   ├── models.test.ts          # /api/models endpoint
│   └── chat.test.ts            # /api/chat endpoint
└── adapters/
    └── adapters.test.ts        # Provider adapter tests
```

### Manual Testing

See `docs/manual_test_plan.md` for comprehensive manual test cases covering:
- Server health checks
- Model loading
- Add-in loading
- Context scoping
- All MVP tasks
- Error recovery
- Idempotency

### Quick Verification

```bash
# Verify server is running
curl http://localhost:3001/health

# Check available models
curl http://localhost:3001/models | jq

# Test chat endpoint (requires valid API key in .env)
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "gpt-4o-mini",
    "messages": [{"id":"1","role":"user","content":"Hello","timestamp":0}],
    "workbookSchema": {
      "name": "Test.xlsx",
      "sheets": [{"name":"Sheet1","usedRange":"A1","tables":[],"charts":[],"pivotTables":[]}],
      "namedRanges": [],
      "activeSheet": "Sheet1"
    },
    "mode": "plan",
    "contextScope": "workbook"
  }'
```

---

## Deployment

### Local Development

See [Quick Start](#quick-start) above.

### Production Deployment

#### Server (Cloud Run / Docker)

1. **Build the server**:
```bash
npm run build:server
```

2. **Create Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
COPY server/dist ./dist
COPY server/config ./config
RUN npm ci --only=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

3. **Deploy to Cloud Run**:
```bash
gcloud run deploy excel-ai-gateway \
  --source . \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "OPENAI_API_KEY=$OPENAI_API_KEY"
```

#### Add-in (Static Hosting)

1. **Build the add-in**:
```bash
npm run build:addin
```

2. **Update manifest URLs**:
Edit `addin/manifest.xml` to point to your production URLs.

3. **Deploy to static host** (Vercel, Netlify, Azure Blob, etc.):
```bash
# Example: Vercel
cd addin
vercel --prod
```

4. **Submit to Microsoft AppSource** (optional):
See [Microsoft documentation](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish) for store submission.

### SSL Certificates

**Development**: Use `npm run certs` (office-addin-dev-certs)

**Production**: Use proper SSL certificates from your hosting provider or Let's Encrypt.

---

## Troubleshooting

### Add-in Issues

| Problem | Solution |
|---------|----------|
| Add-in doesn't appear in Excel | Verify dev server is running, check SSL certs, clear Office cache |
| "Certificate not trusted" | Run `npm run certs` again, manually trust in Keychain/cert store |
| Task pane is blank | Check browser console (F12), verify manifest URLs |

### Server Issues

| Problem | Solution |
|---------|----------|
| "No models available" | Check API key in `.env`, verify server is running |
| CORS errors | Check `CORS_ORIGIN` setting, verify add-in URL |
| API key errors | Verify key is valid, has credits, and correct provider |

### Clear Office Cache

**Windows**:
```
%LOCALAPPDATA%\Microsoft\Office\16.0\Wef\
```

**macOS**:
```
~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/
rm -rf ~/Library/Containers/com.microsoft.Excel/Data/Library/Caches/
```

---

## Security

### Security Model

- **API keys** are stored server-side only, never exposed to client
- **Office.js sandbox** isolates add-in from system
- **No arbitrary code execution** - only predefined tools
- **All tool arguments validated** with Zod schemas
- **HTTPS required** for add-in communication

### Best Practices

1. Use environment variables for secrets
2. Enable CORS only for known origins in production
3. Implement rate limiting for production deployments
4. Audit ledger entries for compliance
5. Regular dependency updates

---

## Roadmap

### v1.0 (Current)
- [x] Core chat interface
- [x] Multi-model support (OpenAI, Anthropic, Google)
- [x] Plan/Apply workflow
- [x] 10 deterministic tools
- [x] Idempotency ledger
- [x] 4 MVP tasks

### v1.1 (Planned)
- [ ] Undo/redo support
- [ ] More chart types and customization
- [ ] Formula explanation mode
- [ ] Keyboard shortcuts

### v2.0 (Future)
- [ ] Real-time collaboration
- [ ] Custom tool definitions
- [ ] Enterprise SSO
- [ ] Azure OpenAI support
- [ ] Cross-workbook operations
- [ ] Advanced templates library

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

### Development Commands

```bash
npm run dev:server    # Start server in dev mode
npm run dev:addin     # Start add-in in dev mode
npm run build         # Build all packages
npm test              # Run tests
npm run lint          # Lint code
npm run certs         # Install SSL certificates
```

---

## License

MIT License - see LICENSE file for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/excel-ai-agent/issues)
- **Documentation**: [/docs](./docs/)
- **Architecture**: [docs/architecture.md](./docs/architecture.md)
