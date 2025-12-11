import { Router } from 'express';
import { 
  loginController, 
  registerController, 
  getTokenController,
  refreshController,
  verifyController,
  meController,
  logoutController,
  sessionsController
} from '../controllers/auth.controller';
import { validateAuthRequest, validateRefreshRequest } from '../middleware/validateAuth';

export const authRouter = Router();

// Основні endpoints авторизації
authRouter.post('/login', validateAuthRequest, loginController);
authRouter.post('/register', validateAuthRequest, registerController);
authRouter.post('/token', validateAuthRequest, getTokenController);

// Refresh token endpoint
authRouter.post('/refresh', validateRefreshRequest, refreshController);

// Перевірка токена (для десктоп додатку)
authRouter.get('/verify', verifyController);
authRouter.post('/verify', verifyController);

// Профіль користувача
authRouter.get('/me', meController);

// Logout
authRouter.post('/logout', logoutController);

// Активні сесії
authRouter.get('/sessions', sessionsController);
