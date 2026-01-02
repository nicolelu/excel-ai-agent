# Manual Test Plan

This document provides step-by-step instructions for manually testing the Excel AI Assistant.

## Prerequisites

1. Excel Desktop (Windows or macOS) or Excel Online
2. Node.js 18+ installed
3. API key configured in `server/.env`
4. SSL certificates installed (`npm run certs`)

## Setup

1. Start the server:
```bash
cd excel-ai-agent
npm run dev:server
```

2. Start the add-in:
```bash
npm run dev:addin
```

3. Sideload the add-in in Excel:
   - Open Excel
   - Go to Insert → Get Add-ins → Upload My Add-in
   - Browse to `addin/manifest.xml`
   - Click Upload

## Test Cases

### TC-001: Server Health Check

**Objective**: Verify server is running and responding

**Steps**:
1. Open browser to `http://localhost:3001/health`
2. Verify JSON response with `status: "healthy"`

**Expected Result**:
```json
{
  "status": "healthy",
  "timestamp": "...",
  "version": "1.0.0"
}
```

---

### TC-002: Models Endpoint

**Objective**: Verify model catalog is served correctly

**Steps**:
1. Open browser to `http://localhost:3001/models`
2. Verify JSON response contains `models` array
3. Verify at least one model is enabled

**Expected Result**:
- Response contains `models` array
- Each model has: id, label, provider, family, supportsToolCalling, enabled
- `defaultModelId` is present and matches an enabled model

---

### TC-003: Add-in Loads Successfully

**Objective**: Verify add-in appears in Excel

**Steps**:
1. Open Excel
2. Go to Home tab
3. Look for "AI Chat" button

**Expected Result**:
- "AI Chat" button visible in Home tab ribbon
- Clicking it opens the task pane

---

### TC-004: Model Selector Populates

**Objective**: Verify model selector shows available models

**Steps**:
1. Open the AI Chat task pane
2. Click the model dropdown

**Expected Result**:
- Dropdown shows enabled models from catalog
- Models display their labels (e.g., "GPT-4o", "Claude 3.5 Sonnet")
- Default model is pre-selected

---

### TC-005: Model Selection Persists

**Objective**: Verify model selection is saved across sessions

**Steps**:
1. Select a different model from dropdown
2. Close the task pane
3. Reopen the task pane

**Expected Result**:
- Previously selected model is still selected

---

### TC-006: Context Scope Selection

**Objective**: Verify context scope can be changed

**Steps**:
1. Click the Context dropdown in the task pane
2. Select different options (Selection Only, Current Sheet, Entire Workbook)

**Expected Result**:
- Dropdown shows all context options
- Selection changes are reflected in the UI

---

### TC-007: Create Chart (MVP Task 1)

**Objective**: Verify chart creation from data

**Prerequisites**:
- Open a workbook with sample data (e.g., A1:B5 with labels and values)

**Steps**:
1. Select the data range
2. In chat, type: "Create a chart of this data"
3. Review the generated plan
4. Click "Apply Plan"

**Expected Result**:
- Plan shows createChart step
- After apply, chart appears on the sheet
- Chart uses selected data as source
- Success message appears

---

### TC-008: Create Pivot Table (MVP Task 2)

**Objective**: Verify pivot table creation

**Prerequisites**:
- Open a workbook with tabular data including headers

**Steps**:
1. Select data with headers
2. In chat, type: "Create a pivot table from this data"
3. Review the generated plan
4. Click "Apply Plan"

**Expected Result**:
- Plan shows ensureTable and createPivotTable steps
- After apply, pivot table appears (possibly on new sheet)
- Pivot table has appropriate row/column/value fields
- Success message appears

---

### TC-009: Create 3-Statement Model (MVP Task 3)

**Objective**: Verify financial model template creation

**Prerequisites**:
- Open an empty workbook

**Steps**:
1. In chat, type: "Create a 3-statement financial model"
2. Review the generated plan
3. Click "Apply Plan"

**Expected Result**:
- Plan shows multiple createSheet steps
- After apply, new sheets appear:
  - Inputs (or Assumptions)
  - Income Statement
  - Balance Sheet
  - Cash Flow
- Sheets contain structured headers and layout
- Some cells contain formulas referencing Inputs
- Success message appears

---

### TC-010: Create PE Customer Cube (MVP Task 4)

**Objective**: Verify customer cube creation

**Prerequisites**:
- Open an empty workbook

**Steps**:
1. In chat, type: "Create a PE customer cube with sample data"
2. Review the generated plan
3. Click "Apply Plan"

**Expected Result**:
- Plan shows createSheet, writeRange, and potentially createPivotTable steps
- After apply:
  - Data sheet with normalized structure
  - At least one pivot/view sheet
- Data structure suitable for slicing/filtering
- Success message appears

---

### TC-011: Plan Cancel

**Objective**: Verify plan can be cancelled

**Steps**:
1. Request any operation that generates a plan
2. Click "Cancel" button on the plan preview

**Expected Result**:
- Plan disappears
- "Plan cancelled" message appears
- No changes made to workbook

---

### TC-012: Error Recovery

**Objective**: Verify graceful error handling

**Steps**:
1. Stop the server (Ctrl+C)
2. Try to send a message in the chat

**Expected Result**:
- Error toast/message appears
- UI remains responsive
- After restarting server, chat works again

---

### TC-013: Idempotency Check

**Objective**: Verify duplicate operations are handled

**Steps**:
1. Create a sheet named "TestSheet"
2. In chat, type: "Create a sheet named TestSheet"
3. Review and apply the plan

**Expected Result**:
- Either:
  - Plan shows sheet already exists (reconciliation)
  - Or: Sheet created with suffix (e.g., "TestSheet (2)")
- No error from duplicate creation

---

### TC-014: Refresh Controls

**Objective**: Verify manual refresh works

**Steps**:
1. Click the refresh button next to model selector
2. Click the refresh button next to context scope

**Expected Result**:
- Model list refreshes (no errors)
- Workbook context refreshes (selection updates)

---

### TC-015: Clear Conversation

**Objective**: Verify conversation can be cleared

**Steps**:
1. Send a few messages
2. Click the clear/delete button

**Expected Result**:
- All messages disappear
- Empty state with templates appears
- Ready for new conversation

---

## Test Results Template

| Test Case | Pass/Fail | Notes | Tester | Date |
|-----------|-----------|-------|--------|------|
| TC-001 | | | | |
| TC-002 | | | | |
| TC-003 | | | | |
| TC-004 | | | | |
| TC-005 | | | | |
| TC-006 | | | | |
| TC-007 | | | | |
| TC-008 | | | | |
| TC-009 | | | | |
| TC-010 | | | | |
| TC-011 | | | | |
| TC-012 | | | | |
| TC-013 | | | | |
| TC-014 | | | | |
| TC-015 | | | | |

## Known Issues

Document any known issues here:

1. _None documented yet_

## Troubleshooting

### Add-in doesn't load
- Check console for errors
- Verify manifest.xml URLs match running server
- Clear Office cache

### API errors
- Verify API key is set in server/.env
- Check server logs for detailed errors
- Ensure CORS is properly configured

### Tool execution fails
- Check browser console for Office.js errors
- Verify the worksheet/range exists
- Check for permission issues
