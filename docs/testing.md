# Testing Guide

This document covers the testing strategy, tools, and practices for the Excel AI Assistant.

## Table of Contents

- [Testing Overview](#testing-overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Categories](#test-categories)
- [Mocking Strategies](#mocking-strategies)
- [Manual Testing](#manual-testing)
- [CI/CD Integration](#cicd-integration)
- [Coverage Requirements](#coverage-requirements)

---

## Testing Overview

### Testing Pyramid

```
                    ┌───────────┐
                    │   E2E     │  Manual testing in Excel
                    │  Tests    │  (add-in loaded)
                    ├───────────┤
                   │ Integration │  API endpoint tests
                   │   Tests     │  (routes, services)
                   ├─────────────┤
                  │    Unit       │  Individual functions
                  │   Tests       │  (adapters, utilities)
                  └───────────────┘
```

### Testing Stack

| Component | Framework | Purpose |
|-----------|-----------|---------|
| Server | Jest | Unit & integration tests |
| Add-in | Vitest | Unit tests (when applicable) |
| E2E | Manual | Full workflow testing in Excel |

---

## Test Structure

### Directory Layout

```
server/
├── src/
│   ├── __tests__/
│   │   ├── services/
│   │   │   ├── modelService.test.ts
│   │   │   ├── chatService.test.ts
│   │   │   └── templateService.test.ts
│   │   ├── routes/
│   │   │   ├── models.test.ts
│   │   │   └── chat.test.ts
│   │   └── adapters/
│   │       └── adapters.test.ts
│   └── ...
├── jest.config.js
└── package.json

addin/
├── src/
│   └── __tests__/
│       └── ... (future)
├── vitest.config.ts
└── package.json
```

---

## Running Tests

### All Tests

```bash
# Run all server tests
npm test

# Run with verbose output
npm test -- --verbose

# Run with coverage
npm test -- --coverage
```

### Specific Tests

```bash
# Run specific test file
npm test -- modelService.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should load models"

# Run tests in watch mode
npm test -- --watch
```

### Add-in Tests (Vitest)

```bash
# Run add-in tests
cd addin
npm test

# Run with UI
npm run test:ui
```

---

## Writing Tests

### Test File Naming

- Use `.test.ts` suffix for test files
- Place tests in `__tests__` directories near source files
- Mirror the source directory structure

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { myFunction } from '../myModule';

describe('myFunction', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('expected');
  });

  it('should handle edge case', () => {
    expect(() => myFunction(null)).toThrow('Invalid input');
  });
});
```

### Async Test Example

```typescript
describe('asyncFunction', () => {
  it('should resolve with data', async () => {
    const result = await asyncFunction();
    expect(result).toHaveProperty('data');
  });

  it('should reject on error', async () => {
    await expect(asyncFunction('bad-input')).rejects.toThrow();
  });
});
```

---

## Test Categories

### 1. Unit Tests

Test individual functions in isolation.

**Example: Model Service**

```typescript
// server/src/__tests__/services/modelService.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ModelService } from '../../services/modelService';

describe('ModelService', () => {
  let service: ModelService;

  beforeEach(() => {
    service = new ModelService();
  });

  describe('getEnabledModels', () => {
    it('should return only enabled models', () => {
      const models = service.getEnabledModels();
      expect(models.every(m => m.enabled)).toBe(true);
    });

    it('should filter by provider', () => {
      const models = service.getModelsByProvider('openai');
      expect(models.every(m => m.provider === 'openai')).toBe(true);
    });
  });

  describe('getDefaultModel', () => {
    it('should return the default model', () => {
      const defaultModel = service.getDefaultModel();
      expect(defaultModel).toBeDefined();
      expect(defaultModel.enabled).toBe(true);
    });
  });
});
```

### 2. Integration Tests

Test API endpoints with real HTTP requests.

**Example: Models Route**

```typescript
// server/src/__tests__/routes/models.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../index';

describe('GET /api/models', () => {
  it('should return 200 and models array', async () => {
    const response = await request(app)
      .get('/api/models')
      .expect(200);

    expect(response.body).toHaveProperty('models');
    expect(Array.isArray(response.body.models)).toBe(true);
  });

  it('should include defaultModelId', async () => {
    const response = await request(app)
      .get('/api/models')
      .expect(200);

    expect(response.body).toHaveProperty('defaultModelId');
    expect(typeof response.body.defaultModelId).toBe('string');
  });
});
```

**Example: Chat Route**

```typescript
// server/src/__tests__/routes/chat.test.ts
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app } from '../../index';

describe('POST /api/chat', () => {
  const validRequest = {
    modelId: 'gpt-4o-mini',
    messages: [
      { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }
    ],
    workbookSchema: {
      sheets: [
        { name: 'Sheet1', usedRange: 'A1', tables: [], charts: [], pivotTables: [] }
      ]
    },
    mode: 'plan',
    contextScope: 'workbook'
  };

  it('should return 400 for missing modelId', async () => {
    const { modelId, ...invalidRequest } = validRequest;

    const response = await request(app)
      .post('/api/chat')
      .send(invalidRequest)
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should return 400 for invalid mode', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ ...validRequest, mode: 'invalid' })
      .expect(400);

    expect(response.body.success).toBe(false);
  });

  it('should accept valid request structure', async () => {
    // Note: This may fail without real API keys
    // Use mocks for CI environments
    const response = await request(app)
      .post('/api/chat')
      .send(validRequest);

    // At minimum, should not be a validation error
    expect(response.status).not.toBe(400);
  });
});
```

### 3. Adapter Tests

Test LLM provider adapters.

```typescript
// server/src/__tests__/adapters/adapters.test.ts
import { describe, it, expect } from '@jest/globals';
import { createAdapter } from '../../adapters';

describe('Adapter Factory', () => {
  it('should create OpenAI adapter', () => {
    const adapter = createAdapter('openai');
    expect(adapter).toBeDefined();
    expect(adapter.id).toBe('openai');
  });

  it('should create Anthropic adapter', () => {
    const adapter = createAdapter('anthropic');
    expect(adapter).toBeDefined();
    expect(adapter.id).toBe('anthropic');
  });

  it('should create Google adapter', () => {
    const adapter = createAdapter('google');
    expect(adapter).toBeDefined();
    expect(adapter.id).toBe('google');
  });

  it('should throw for unknown provider', () => {
    expect(() => createAdapter('unknown')).toThrow();
  });
});
```

### 4. Template Tests

Test plan template generation.

```typescript
// server/src/__tests__/services/templateService.test.ts
import { describe, it, expect } from '@jest/globals';
import { TemplateService } from '../../services/templateService';

describe('TemplateService', () => {
  const service = new TemplateService();

  describe('generate3StatementModel', () => {
    it('should generate all required sheets', () => {
      const plan = service.generate3StatementModel();

      const sheetSteps = plan.steps.filter(s => s.toolName === 'createSheet');
      const sheetNames = sheetSteps.map(s => s.args.name);

      expect(sheetNames).toContain('Inputs');
      expect(sheetNames).toContain('Income Statement');
      expect(sheetNames).toContain('Balance Sheet');
      expect(sheetNames).toContain('Cash Flow');
    });

    it('should include write steps for each sheet', () => {
      const plan = service.generate3StatementModel();

      const writeSteps = plan.steps.filter(s => s.toolName === 'writeRange');
      expect(writeSteps.length).toBeGreaterThan(0);
    });
  });

  describe('generatePECustomerCube', () => {
    it('should generate data and pivot sheets', () => {
      const plan = service.generatePECustomerCube();

      const createSheetSteps = plan.steps.filter(s => s.toolName === 'createSheet');
      expect(createSheetSteps.length).toBeGreaterThanOrEqual(2);
    });
  });
});
```

---

## Mocking Strategies

### Mocking External APIs

```typescript
import { jest } from '@jest/globals';

// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            { message: { content: 'Mocked response' } }
          ]
        })
      }
    }
  }))
}));
```

### Mocking Environment Variables

```typescript
describe('with API key', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should load models with key', () => {
    // Test with mocked env
  });
});
```

### Mocking File System

```typescript
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({
    models: [{ id: 'test-model', enabled: true }]
  }))
}));
```

---

## Manual Testing

### Test Plan Reference

See `docs/manual_test_plan.md` for detailed manual test cases.

### Quick Manual Test Workflow

1. **Start servers**:
```bash
npm run dev:server  # Terminal 1
npm run dev:addin   # Terminal 2
```

2. **Verify server**:
```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/models
```

3. **Sideload add-in in Excel**:
   - Insert > Get Add-ins > Upload My Add-in
   - Select `addin/manifest.xml`

4. **Test basic workflow**:
   - Open task pane (Home > AI Chat)
   - Select a model
   - Send: "Create a chart from A1:D10"
   - Review plan
   - Click Apply

5. **Test error handling**:
   - Stop server and verify error message
   - Send invalid request and verify graceful handling

### Testing Checklist

- [ ] Server health endpoint responds
- [ ] Models load in dropdown
- [ ] Model selection persists
- [ ] Context scope can be changed
- [ ] Chat messages send successfully
- [ ] Plans display correctly
- [ ] Apply executes tools
- [ ] Cancel dismisses plan
- [ ] Errors display clearly
- [ ] Clear conversation works

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build shared
        run: npm run build:shared

      - name: Run tests
        run: npm test -- --coverage
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./server/coverage/lcov.info
```

### Pre-commit Hooks

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm test"
    }
  }
}
```

---

## Coverage Requirements

### Minimum Coverage Targets

| Metric | Target |
|--------|--------|
| Statements | 70% |
| Branches | 60% |
| Functions | 70% |
| Lines | 70% |

### Jest Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70
    }
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**'
  ]
};
```

### Viewing Coverage Report

```bash
npm test -- --coverage

# Open HTML report
open server/coverage/lcov-report/index.html
```

---

## Testing Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// Good: Tests behavior
it('should return enabled models', () => {
  const models = service.getEnabledModels();
  expect(models.every(m => m.enabled)).toBe(true);
});

// Bad: Tests implementation details
it('should filter array with .filter()', () => {
  // Don't test HOW it filters, test WHAT it returns
});
```

### 2. Use Descriptive Test Names

```typescript
// Good
it('should return 400 when modelId is missing from request body')

// Bad
it('should fail')
it('test modelId')
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should calculate total correctly', () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
```

### 4. One Assertion Per Test (When Possible)

```typescript
// Good: Clear what's being tested
it('should have correct status', () => {
  expect(response.status).toBe(200);
});

it('should include models array', () => {
  expect(response.body.models).toBeInstanceOf(Array);
});
```

### 5. Test Edge Cases

```typescript
describe('getModelById', () => {
  it('should return model when exists', () => { ... });
  it('should return undefined when not found', () => { ... });
  it('should handle empty string id', () => { ... });
  it('should handle null id', () => { ... });
});
```

---

## Debugging Tests

### Run Single Test with Debug

```bash
# With Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand modelService.test.ts
```

### Verbose Output

```bash
npm test -- --verbose --no-coverage
```

### Print Statements

```typescript
it('should work', () => {
  console.log('Debug:', someValue);
  // Or use debugger; with --inspect-brk
});
```

---

## Common Issues

### Tests Hang

- Check for unresolved promises
- Use `--detectOpenHandles` flag
- Ensure proper cleanup in `afterEach`

### Timeouts

```typescript
// Increase timeout for slow operations
it('should complete long operation', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Import Errors

- Ensure `ts-jest` is configured correctly
- Check `moduleNameMapper` in jest.config.js
- Verify TypeScript paths match Jest configuration
