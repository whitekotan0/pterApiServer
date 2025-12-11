import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER || 'pteroservise';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'mineai-desktop';

// In-memory blacklist (синхронізувати з auth-service в продакшені через Redis)
const tokenBlacklist = new Set<string>();

if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production' || JWT_SECRET === 'default-secret-change-in-production') {
  console.error('⚠️  WARNING: JWT_SECRET is not set or using default value!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  firebaseUid: string;
  jti?: string;
  type?: 'access' | 'refresh';
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Token is required',
      code: 'TOKEN_MISSING',
    });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ 
      success: false,
      error: 'Server configuration error',
      code: 'CONFIG_ERROR',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTPayload;
    
    // Перевіряємо чи токен в blacklist
    if (decoded.jti && tokenBlacklist.has(decoded.jti)) {
      return res.status(401).json({ 
        success: false,
        error: 'Token has been revoked',
        code: 'TOKEN_REVOKED',
      });
    }
    
    // Перевіряємо тип токена (має бути access)
    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token type',
        code: 'INVALID_TOKEN_TYPE',
      });
    }
    
    req.user = decoded;
    next();
  } catch (error: any) {
    // Детальна обробка помилок JWT
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt,
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        success: false,
        error: 'Invalid token',
        code: 'TOKEN_INVALID',
      });
    }
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token not yet valid',
        code: 'TOKEN_NOT_ACTIVE',
      });
    }
    
    return res.status(403).json({ 
      success: false,
      error: 'Token verification failed',
      code: 'VERIFICATION_FAILED',
    });
  }
};

// Функція для додавання токена в blacklist (для синхронізації з auth-service)
export const addToBlacklist = (jti: string): void => {
  tokenBlacklist.add(jti);
};

// Опціональна автентифікація (для endpoints що можуть працювати і без авторизації)
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Немає токена - продовжуємо без user
    return next();
  }

  if (!JWT_SECRET) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTPayload;
    
    if (decoded.jti && !tokenBlacklist.has(decoded.jti)) {
      req.user = decoded;
    }
  } catch {
    // Невалідний токен - ігноруємо, продовжуємо без user
  }
  
  next();
};
