import { Router } from 'express';
import { processMermaidController, getBalanceController } from '../controllers/gpt.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateMermaidRequest } from '../middleware/validateMermaid';

export const gptRouter = Router();

// Обробка Mermaid діаграми (потребує авторизації)
gptRouter.post(
  '/process',
  authenticateToken,
  validateMermaidRequest,
  processMermaidController
);

// Отримання балансу токенів користувача
gptRouter.get(
  '/balance',
  authenticateToken,
  getBalanceController
);

// Також POST для балансу (для зручності клієнта)
gptRouter.post(
  '/balance',
  authenticateToken,
  getBalanceController
);
