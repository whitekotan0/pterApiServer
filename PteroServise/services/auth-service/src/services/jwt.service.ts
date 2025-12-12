import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '_refresh';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'; // Access token - коротший час життя
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d'; // Refresh token - довший час життя
const JWT_ISSUER = process.env.JWT_ISSUER || 'pteroservise';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'mineai-desktop';

// Перевірка наявності JWT_SECRET
if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-this-in-production' || JWT_SECRET === 'default-secret-change-in-production') {
  console.error('⚠️  WARNING: JWT_SECRET is not set or using default value!');
  console.error('⚠️  Please set a strong random JWT_SECRET in your .env file');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
}

// Blacklist для інвалідованих токенів (в продакшені використовуйте Redis)
const tokenBlacklist = new Set<string>();

// Зберігання refresh токенів (в продакшені використовуйте Redis/DB)
const refreshTokenStore = new Map<string, {
  userId: string;
  jti: string;
  createdAt: Date;
  expiresAt: Date;
  deviceInfo?: string;
}>();

export interface JWTPayload {
  userId: string;
  email: string;
  firebaseUid: string;
  jti?: string; // JWT ID для унікальності
  type?: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // секунди до закінчення access token
  refreshExpiresIn: number; // секунди до закінчення refresh token
}

// Генерація унікального JWT ID
const generateJti = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Парсинг часу закінчення в секунди
const parseExpiresIn = (expiresIn: string): number => {
  const match = expiresIn.match(/^(\d+)([smhdw])$/);
  if (!match) return 900; // default 15 minutes
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    case 'w': return value * 60 * 60 * 24 * 7;
    default: return 900;
  }
};

// Генерація пари токенів (access + refresh)
export const generateTokenPair = (payload: Omit<JWTPayload, 'jti' | 'type'>, deviceInfo?: string): TokenPair => {
  const accessJti = generateJti();
  const refreshJti = generateJti();
  
  const accessOptions: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };
  
  const refreshOptions: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };
  
  const accessToken = jwt.sign(
    { ...payload, jti: accessJti, type: 'access' },
    JWT_SECRET!,
    accessOptions
  );
  
  const refreshToken = jwt.sign(
    { ...payload, jti: refreshJti, type: 'refresh' },
    JWT_REFRESH_SECRET,
    refreshOptions
  );
  
  // Зберігаємо refresh token
  const refreshExpiresIn = parseExpiresIn(JWT_REFRESH_EXPIRES_IN);
  refreshTokenStore.set(refreshJti, {
    userId: payload.userId,
    jti: refreshJti,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
    deviceInfo,
  });
  
  return {
    accessToken,
    refreshToken,
    expiresIn: parseExpiresIn(JWT_EXPIRES_IN),
    refreshExpiresIn,
  };
};

// Генерація тільки access token (для зворотної сумісності)
export const generateJWT = (payload: Omit<JWTPayload, 'jti' | 'type'>): string => {
  const jti = generateJti();
  
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };
  
  return jwt.sign(
    { ...payload, jti, type: 'access' },
    JWT_SECRET!,
    options
  );
};

// Верифікація access token
export const verifyJWT = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTPayload;
    
    // Перевіряємо чи токен в blacklist
    if (decoded.jti && tokenBlacklist.has(decoded.jti)) {
      throw new Error('Token has been revoked');
    }
    
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error(error.message || 'Token verification failed');
  }
};

// Верифікація refresh token
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JWTPayload;
    
    // Перевіряємо чи refresh token в blacklist
    if (decoded.jti && tokenBlacklist.has(decoded.jti)) {
      throw new Error('Refresh token has been revoked');
    }
    
    // Перевіряємо чи refresh token ще існує в сховищі
    if (decoded.jti && !refreshTokenStore.has(decoded.jti)) {
      throw new Error('Refresh token not found or already used');
    }
    
    // Перевіряємо тип токена
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw new Error(error.message || 'Refresh token verification failed');
  }
};

// Оновлення токенів через refresh token
export const refreshTokens = (refreshToken: string, deviceInfo?: string): TokenPair => {
  const decoded = verifyRefreshToken(refreshToken);
  
  // Видаляємо старий refresh token (rotation strategy)
  if (decoded.jti) {
    refreshTokenStore.delete(decoded.jti);
  }
  
  // Генеруємо нову пару токенів
  return generateTokenPair({
    userId: decoded.userId,
    email: decoded.email,
    firebaseUid: decoded.firebaseUid,
  }, deviceInfo);
};

// Інвалідація токена (logout)
export const revokeToken = (token: string): boolean => {
  try {
    // Декодуємо без верифікації щоб отримати jti
    const decoded = jwt.decode(token) as JWTPayload;
    
    if (decoded?.jti) {
      tokenBlacklist.add(decoded.jti);
      
      // Якщо це refresh token, видаляємо з сховища
      if (decoded.type === 'refresh') {
        refreshTokenStore.delete(decoded.jti);
      }
      
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

// Інвалідація всіх токенів користувача
export const revokeAllUserTokens = (userId: string): number => {
  let count = 0;
  
  // Видаляємо всі refresh токени користувача
  for (const [jti, data] of refreshTokenStore.entries()) {
    if (data.userId === userId) {
      refreshTokenStore.delete(jti);
      tokenBlacklist.add(jti);
      count++;
    }
  }
  
  return count;
};

// Отримання активних сесій користувача
export const getUserSessions = (userId: string): Array<{
  jti: string;
  createdAt: Date;
  expiresAt: Date;
  deviceInfo?: string;
}> => {
  const sessions: Array<{
    jti: string;
    createdAt: Date;
    expiresAt: Date;
    deviceInfo?: string;
  }> = [];
  
  for (const [, data] of refreshTokenStore.entries()) {
    if (data.userId === userId && data.expiresAt > new Date()) {
      sessions.push({
        jti: data.jti,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        deviceInfo: data.deviceInfo,
      });
    }
  }
  
  return sessions;
};

// Очищення прострочених токенів (запускати періодично)
export const cleanupExpiredTokens = (): { refreshTokens: number; blacklist: number } => {
  let refreshCount = 0;
  const now = new Date();
  
  // Очищаємо прострочені refresh токени
  for (const [jti, data] of refreshTokenStore.entries()) {
    if (data.expiresAt < now) {
      refreshTokenStore.delete(jti);
      refreshCount++;
    }
  }
  
  // Blacklist очищається автоматично (JWT декодується з помилкою якщо прострочений)
  // В продакшені з Redis можна встановити TTL
  
  return { refreshTokens: refreshCount, blacklist: 0 };
};

// Запускаємо очищення кожну годину
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
