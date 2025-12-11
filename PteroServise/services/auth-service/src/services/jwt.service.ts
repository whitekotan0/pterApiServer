import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Перевірка наявності JWT_SECRET
if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production' || JWT_SECRET === 'default-secret-change-in-production') {
  console.error('⚠️  WARNING: JWT_SECRET is not set or using default value!');
  console.error('⚠️  Please set a strong random JWT_SECRET in your .env file');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  firebaseUid: string;
}

export const generateJWT = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

export const verifyJWT = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
};

