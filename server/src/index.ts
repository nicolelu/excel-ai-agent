import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { modelsRouter } from './routes/models';
import { chatRouter } from './routes/chat';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/health', healthRouter);
app.use('/models', modelsRouter);
app.use('/chat', chatRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Excel AI Agent Gateway running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Models endpoint: http://localhost:${PORT}/models`);
  console.log(`Chat endpoint: http://localhost:${PORT}/chat`);
});

export { app };
