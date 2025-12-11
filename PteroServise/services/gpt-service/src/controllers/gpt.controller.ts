import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { processMermaidWithGPT } from '../services/openai.service';
import { checkUserTokens, deductTokens, getUserTokenInfo, TokenInfo } from '../services/token.service';

// Обробка Mermaid діаграми
export const processMermaidController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { mermaid, text } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Перевіряємо токени та ліміти користувача
    const tokenCheck = checkUserTokens(userId);
    
    if (!tokenCheck.hasTokens) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient tokens or requests',
        code: 'INSUFFICIENT_TOKENS',
        tokensRemaining: tokenCheck.tokensRemaining,
        requestsRemaining: tokenCheck.requestsRemaining,
      });
    }

    // Передаємо в ChatGPT та отримуємо код + кількість використаних токенів
    const { code, tokensUsed } = await processMermaidWithGPT({ mermaid, text });

    // Записуємо в БД кількість потрачених токенів
    deductTokens(userId, tokensUsed, 1);

    // Отримуємо оновлену інформацію про токени
    const updatedTokenCheck = checkUserTokens(userId);

    // Повертаємо код назад
    res.json({
      success: true,
      code,
      tokensUsed,
      tokensRemaining: updatedTokenCheck.tokensRemaining,
      requestsRemaining: updatedTokenCheck.requestsRemaining,
    });
  } catch (error: any) {
    console.error('Error processing Mermaid:', error);
    
    // Специфічні коди помилок
    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        message: error.message,
      });
    }
    
    if (error.message.includes('API key')) {
      return res.status(503).json({
        success: false,
        error: 'Service configuration error',
        code: 'SERVICE_ERROR',
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process Mermaid diagram',
      code: 'PROCESSING_ERROR',
    });
  }
};

// Отримання балансу токенів користувача
export const getBalanceController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const tokenInfo = getUserTokenInfo(userId);

    res.json({
      success: true,
      balance: {
        tokensRemaining: tokenInfo.tokensRemaining,
        tokensUsed: tokenInfo.tokensUsed,
        requestsRemaining: tokenInfo.requestsRemaining,
        requestsUsed: tokenInfo.requestsUsed,
        plan: tokenInfo.plan,
        planExpiresAt: tokenInfo.planExpiresAt,
      },
    });
  } catch (error: any) {
    console.error('Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get balance',
      code: 'BALANCE_ERROR',
    });
  }
};

// Health check для GPT сервісу
export const healthController = async (
  req: AuthRequest,
  res: Response
) => {
  res.json({
    success: true,
    service: 'gpt-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
};
