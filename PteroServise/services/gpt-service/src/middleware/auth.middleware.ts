import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production' || JWT_SECRET === 'default-secret-change-in-production') {
  console.error('⚠️  WARNING: JWT_SECRET is not set or using default value!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    firebaseUid: string;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token is required' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      firebaseUid: string;
    };
    req.user = decoded;
    next();
  } catch (error: any) {
    // Більш детальна обробка помилок
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

