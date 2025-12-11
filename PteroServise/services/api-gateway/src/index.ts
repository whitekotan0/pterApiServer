import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Конфігурація сервісів
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const GPT_SERVICE_URL = process.env.GPT_SERVICE_URL || 'http://gpt-service:3002';

// Безпека: Helmet для захисту заголовків
app.use(helmet({
  contentSecurityPolicy: false, // Вимкнено для API
  crossOriginEmbedderPolicy: false,
}));

// Безпека: CORS налаштування
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
  optionsSuccessStatus: 200,
}));

// Безпека: Обмеження розміру тіла запиту (10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Безпека: Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 100, // максимум 100 запитів з одного IP
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Більш строгий rate limiting для auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // максимум 20 спроб авторизації
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    services: {
      auth: AUTH_SERVICE_URL,
      gpt: GPT_SERVICE_URL,
    },
  });
});

// Проксі для auth-service з timeout та retry
app.use(
  '/api/auth',
  authLimiter,
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/auth': '/api/auth',
    },
    timeout: 30000, // 30 секунд timeout
    proxyTimeout: 30000,
    onError: (err, req, res) => {
      console.error('Auth service proxy error:', err);
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Auth service unavailable',
          message: process.env.NODE_ENV === 'production' ? 'Service temporarily unavailable' : err.message,
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      // Логування запитів (тільки в dev режимі)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      }
    },
  })
);

// Проксі для gpt-service з timeout
app.use(
  '/api/gpt',
  createProxyMiddleware({
    target: GPT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/api/gpt': '/api/gpt',
    },
    timeout: 120000, // 2 хвилини timeout для GPT запитів
    proxyTimeout: 120000,
    onError: (err, req, res) => {
      console.error('GPT service proxy error:', err);
      if (!res.headersSent) {
        res.status(503).json({
          error: 'GPT service unavailable',
          message: process.env.NODE_ENV === 'production' ? 'Service temporarily unavailable' : err.message,
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      }
    },
  })
);

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Auth service: ${AUTH_SERVICE_URL}`);
  console.log(`GPT service: ${GPT_SERVICE_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Обробка сигналів для graceful shutdown
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

