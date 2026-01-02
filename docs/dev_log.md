# Development Log

This document tracks issues encountered during development and their resolutions.

## Log Entries

### Entry 1 - Initial Setup
**Date**: 2024-01-XX
**Phase**: Phase 1 - Scaffolding

**Task**: Set up monorepo structure with shared types, server, and add-in packages.

**Outcome**: Success
- Created `/shared` for TypeScript types
- Created `/server` for Express LLM gateway
- Created `/addin` for Office Add-in React app
- Configured npm workspaces

**Notes**: Using npm workspaces for package management. Vite for add-in bundling, tsx for server development.

---

### Entry 2 - Type System Design
**Date**: 2024-01-XX
**Phase**: Phase 1 - Types

**Task**: Define shared types for tools, plans, messages, and ledger.

**Outcome**: Success
- Created comprehensive tool definitions with parameter schemas
- Defined ExecutionPlan and PlanStep structures
- Created ChatMessage and streaming response types
- Implemented LedgerEntry for idempotency

**Notes**: Using Zod for runtime validation on server side. Types are exported from `/shared/types`.

---

### Entry 3 - Provider Adapters
**Date**: 2024-01-XX
**Phase**: Phase 3 - Gateway

**Task**: Implement LLM provider adapters for OpenAI, Anthropic, and Google.

**Outcome**: Success
- Created abstract LLMProvider interface
- Implemented OpenAI adapter with tool calling
- Implemented Anthropic adapter with tool_use blocks
- Implemented Google adapter with function calling
- Added factory function to create adapters based on provider

**Notes**: Each provider has slightly different message formats. Streaming support added for all providers.

---

### Entry 4 - Office.js Tool Layer
**Date**: 2024-01-XX
**Phase**: Phase 2 - Tools

**Task**: Implement deterministic Excel tools using Office.js.

**Outcome**: Success
- Implemented 10 tools: getWorkbookSchema, getRangeValues, createSheet, ensureTable, writeRange, setFormula, createChart, createPivotTable, formatRange, addNamedRange
- Added idempotency ledger integration
- Implemented collision avoidance for names

**Notes**:
- Batching context.sync() calls for performance
- Using ledger service to track created artifacts
- generateUniqueName helper for collision avoidance

---

### Entry 5 - Plan/Apply Workflow
**Date**: 2024-01-XX
**Phase**: Phase 4 - Workflow

**Task**: Implement the plan/apply workflow with tool calling.

**Outcome**: Success
- Chat service processes plan and apply modes
- Plan mode generates structured ExecutionPlan
- Apply mode executes plan steps sequentially
- Tool results fed back to LLM for continuation

**Notes**: Plan extraction uses JSON parsing from LLM response. Need to ensure LLM consistently returns proper JSON format.

---

### Entry 6 - Template Service
**Date**: 2024-01-XX
**Phase**: Phase 5 - MVP Tasks

**Task**: Create templates for 3-statement model and PE customer cube.

**Outcome**: Success
- Implemented generate3StatementModel() with 13 steps
- Implemented generatePECustomerCube() with 9 steps
- Added helper methods for simple chart and pivot plans

**Notes**: Templates provide deterministic plans for complex tasks. Can be extended with more templates.

---

## Pending Issues

1. **SSL Certificates**: Need to document certificate generation for local development
2. **Error Handling**: Need more detailed error messages for tool failures
3. **Token Estimation**: Currently using rough estimates, need actual tokenizer

## Resolution Template

```markdown
### Entry N - [Title]
**Date**: YYYY-MM-DD
**Phase**: Phase X - Description

**Issue**:
[Description of the problem]

**Root Cause**:
[Analysis of why it happened]

**Fix**:
[What was done to resolve it]

**Verification**:
[How it was verified to be fixed]

**Prevention**:
[Steps to prevent recurrence]
```
