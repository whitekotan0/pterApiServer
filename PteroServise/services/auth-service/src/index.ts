import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.routes';
import { errorHandler } from './middleware/errorHandler';
import { isFirebaseInitialized } from './services/firebase.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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

// Безпека: Обмеження розміру тіла
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Безпека: Rate limiting для auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 10, // максимум 10 спроб
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter, authRouter);

// Health check з перевіркою залежностей
app.get('/health', async (req, res) => {
  try {
    const firebaseOk = isFirebaseInitialized();
    const health = {
      status: firebaseOk ? 'ok' : 'degraded',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        firebase: firebaseOk ? 'connected' : 'NOT CONFIGURED - check .env file!',
      },
    };
    
    if (!firebaseOk) {
      console.warn('⚠️  Health check: Firebase not initialized');
    }
    
    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'auth-service',
      error: 'Service unhealthy',
    });
  }
});

app.use(errorHandler);

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
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

