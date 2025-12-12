import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { gptRouter } from './routes/gpt.routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Безпека: Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Безпека: CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Безпека: Обмеження розміру тіла (більше для GPT запитів)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Безпека: Rate limiting для GPT endpoints
const gptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 50, // максимум 50 запитів
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/gpt', gptLimiter, gptRouter);

// Health check
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      service: 'gpt-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      openaiConfigured: !!process.env.OPENAI_API_KEY,
    };
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'gpt-service',
      error: 'Service unhealthy',
    });
  }
});

app.use(errorHandler);

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`GPT service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
