/**
 * API Routes Tests
 */

import request from 'supertest';
import express from 'express';
import { modelsRouter } from '../routes/models';
import { healthRouter } from '../routes/health';
import { chatRouter } from '../routes/chat';

// Create test app
const app = express();
app.use(express.json());
app.use('/health', healthRouter);
app.use('/models', modelsRouter);
app.use('/chat', chatRouter);

describe('Health Route', () => {
  it('GET /health should return healthy status', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.version).toBeDefined();
  });
});

describe('Models Route', () => {
  it('GET /models should return models list', async () => {
    const response = await request(app).get('/models');

    expect(response.status).toBe(200);
    expect(response.body.models).toBeDefined();
    expect(Array.isArray(response.body.models)).toBe(true);
  });

  it('GET /models should return defaultModelId', async () => {
    const response = await request(app).get('/models');

    expect(response.status).toBe(200);
    // If there are models, should have a default
    if (response.body.models.length > 0) {
      expect(response.body.defaultModelId).toBeDefined();
    }
  });

  it('POST /models/refresh should reload catalog', async () => {
    const response = await request(app).post('/models/refresh');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.models).toBeDefined();
  });
});

describe('Chat Route', () => {
  const validChatRequest = {
    modelId: 'gpt-4o',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      },
    ],
    workbookSchema: {
      name: 'Test.xlsx',
      sheets: [
        {
          name: 'Sheet1',
          tables: [],
          charts: [],
          pivotTables: [],
        },
      ],
      namedRanges: [],
      activeSheet: 'Sheet1',
    },
    mode: 'plan',
  };

  it('POST /chat should validate request body', async () => {
    const response = await request(app)
      .post('/chat')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid request');
  });

  it('POST /chat should require modelId', async () => {
    const { modelId, ...requestWithoutModel } = validChatRequest;

    const response = await request(app)
      .post('/chat')
      .send(requestWithoutModel);

    expect(response.status).toBe(400);
  });

  it('POST /chat should require messages', async () => {
    const { messages, ...requestWithoutMessages } = validChatRequest;

    const response = await request(app)
      .post('/chat')
      .send(requestWithoutMessages);

    expect(response.status).toBe(400);
  });

  it('POST /chat should require workbookSchema', async () => {
    const { workbookSchema, ...requestWithoutSchema } = validChatRequest;

    const response = await request(app)
      .post('/chat')
      .send(requestWithoutSchema);

    expect(response.status).toBe(400);
  });

  it('POST /chat should require mode', async () => {
    const { mode, ...requestWithoutMode } = validChatRequest;

    const response = await request(app)
      .post('/chat')
      .send(requestWithoutMode);

    expect(response.status).toBe(400);
  });

  it('POST /chat should validate mode values', async () => {
    const response = await request(app)
      .post('/chat')
      .send({
        ...validChatRequest,
        mode: 'invalid',
      })
      .timeout(3000);

    expect(response.status).toBe(400);
  }, 10000);

  // Note: Full chat tests require API keys to be configured
  // These tests validate request/response structure only
});

describe('Chat Continue Route', () => {
  const validContinueRequest = {
    modelId: 'gpt-4o',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      },
    ],
    workbookSchema: {
      name: 'Test.xlsx',
      sheets: [
        {
          name: 'Sheet1',
          tables: [],
          charts: [],
          pivotTables: [],
        },
      ],
      namedRanges: [],
      activeSheet: 'Sheet1',
    },
    mode: 'plan',
    toolResults: [
      {
        callId: 'call-1',
        result: {
          success: true,
          data: { test: 'data' },
        },
      },
    ],
  };

  it('POST /chat/continue should validate request body', async () => {
    const response = await request(app)
      .post('/chat/continue')
      .send({});

    expect(response.status).toBe(400);
  });

  it('POST /chat/continue should require toolResults', async () => {
    const { toolResults, ...requestWithoutResults } = validContinueRequest;

    const response = await request(app)
      .post('/chat/continue')
      .send(requestWithoutResults);

    expect(response.status).toBe(400);
  });
});
