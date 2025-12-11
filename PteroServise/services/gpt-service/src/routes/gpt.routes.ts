import { Router } from 'express';
import { processMermaidController } from '../controllers/gpt.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateMermaidRequest } from '../middleware/validateMermaid';

export const gptRouter = Router();

gptRouter.post(
  '/process',
  authenticateToken,
  validateMermaidRequest,
  processMermaidController
);

