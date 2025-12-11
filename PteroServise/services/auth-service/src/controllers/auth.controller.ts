import { Request, Response } from 'express';
import { verifyFirebaseToken, getUserById } from '../services/firebase.service';
import { 
  generateTokenPair, 
  verifyJWT, 
  verifyRefreshToken,
  refreshTokens,
  revokeToken,
  revokeAllUserTokens,
  getUserSessions,
  JWTPayload
} from '../services/jwt.service';

// Інтерфейс для авторизованих запитів
export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// Логін - повертає пару токенів
export const loginController = async (req: Request, res: Response) => {
  try {
    const { firebaseToken, deviceInfo } = req.body;

    // Верифікуємо токен від Google Firebase
    const decodedToken = await verifyFirebaseToken(firebaseToken);
    
    // Отримуємо інформацію про користувача
    const user = await getUserById(decodedToken.uid);

    // Генеруємо пару токенів (access + refresh)
    const tokens = generateTokenPair({
      userId: user.uid,
      email: user.email || '',
      firebaseUid: user.uid,
    }, deviceInfo);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    res.status(401).json({
      success: false,
      error: error.message || 'Authentication failed',
    });
  }
};

// Реєстрація - аналогічно логіну (Firebase вже створив юзера)
export const registerController = async (req: Request, res: Response) => {
  try {
    const { firebaseToken, deviceInfo } = req.body;

    // Верифікуємо токен від Google Firebase
    const decodedToken = await verifyFirebaseToken(firebaseToken);
    
    // Отримуємо інформацію про користувача
    const user = await getUserById(decodedToken.uid);

    // Генеруємо пару токенів (access + refresh)
    const tokens = generateTokenPair({
      userId: user.uid,
      email: user.email || '',
      firebaseUid: user.uid,
    }, deviceInfo);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
      message: 'User registered successfully',
    });
  } catch (error: any) {
    console.error('Registration error:', error.message);
    res.status(401).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
};

// Отримання токенів через Firebase token (спрощений варіант)
export const getTokenController = async (req: Request, res: Response) => {
  try {
    const { firebaseToken, deviceInfo } = req.body;

    // Верифікуємо токен від Google Firebase
    const decodedToken = await verifyFirebaseToken(firebaseToken);
    
    // Отримуємо інформацію про користувача
    const user = await getUserById(decodedToken.uid);

    // Генеруємо пару токенів
    const tokens = generateTokenPair({
      userId: user.uid,
      email: user.email || '',
      firebaseUid: user.uid,
    }, deviceInfo);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
    });
  } catch (error: any) {
    console.error('Token generation error:', error.message);
    res.status(401).json({
      success: false,
      error: error.message || 'Token generation failed',
    });
  }
};

// Оновлення токенів через refresh token
export const refreshController = async (req: Request, res: Response) => {
  try {
    const { refreshToken, deviceInfo } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
    }

    // Оновлюємо токени
    const tokens = refreshTokens(refreshToken, deviceInfo);

    res.json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      refreshExpiresIn: tokens.refreshExpiresIn,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error.message);
    
    // Специфічні помилки для клієнта
    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED',
      });
    }
    
    res.status(401).json({
      success: false,
      error: error.message || 'Token refresh failed',
    });
  }
};

// Перевірка валідності access token
export const verifyController = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(400).json({
        success: false,
        valid: false,
        error: 'Token is required',
      });
    }

    // Верифікуємо токен
    const decoded = verifyJWT(token);

    res.json({
      success: true,
      valid: true,
      user: {
        userId: decoded.userId,
        email: decoded.email,
        firebaseUid: decoded.firebaseUid,
      },
    });
  } catch (error: any) {
    // Токен невалідний, але це не помилка сервера
    res.json({
      success: true,
      valid: false,
      error: error.message || 'Token is invalid',
    });
  }
};

// Отримання профілю поточного користувача
export const meController = async (req: AuthRequest, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token is required',
      });
    }

    // Верифікуємо токен
    const decoded = verifyJWT(token);

    // Отримуємо актуальні дані з Firebase
    const user = await getUserById(decoded.firebaseUid);

    res.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        disabled: user.disabled,
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime,
        },
      },
    });
  } catch (error: any) {
    console.error('Me controller error:', error.message);
    
    if (error.message.includes('expired')) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    
    res.status(401).json({
      success: false,
      error: error.message || 'Failed to get user profile',
    });
  }
};

// Logout - інвалідація токенів
export const logoutController = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1];
    const { refreshToken, logoutAll } = req.body;

    if (!accessToken && !refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'At least one token is required',
      });
    }

    let revokedCount = 0;

    // Якщо logoutAll - інвалідуємо всі сесії
    if (logoutAll && accessToken) {
      try {
        const decoded = verifyJWT(accessToken);
        revokedCount = revokeAllUserTokens(decoded.userId);
      } catch {
        // Токен може бути невалідним, але ми все одно спробуємо
      }
    } else {
      // Інвалідуємо окремі токени
      if (accessToken) {
        revokeToken(accessToken);
        revokedCount++;
      }
      if (refreshToken) {
        revokeToken(refreshToken);
        revokedCount++;
      }
    }

    res.json({
      success: true,
      message: logoutAll 
        ? `Logged out from all sessions (${revokedCount} sessions revoked)`
        : 'Logged out successfully',
      revokedCount,
    });
  } catch (error: any) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Logout failed',
    });
  }
};

// Отримання активних сесій
export const sessionsController = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token is required',
      });
    }

    const decoded = verifyJWT(token);
    const sessions = getUserSessions(decoded.userId);

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        id: s.jti.substring(0, 8) + '...', // Показуємо тільки частину ID
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        deviceInfo: s.deviceInfo || 'Unknown device',
      })),
      count: sessions.length,
    });
  } catch (error: any) {
    console.error('Sessions controller error:', error.message);
    res.status(401).json({
      success: false,
      error: error.message || 'Failed to get sessions',
    });
  }
};
