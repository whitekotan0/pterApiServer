import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { processMermaidWithGPT } from '../services/openai.service';
import { checkUserTokens, deductTokens } from '../services/token.service';

export const processMermaidController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { mermaid, text } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Перевіряємо токен та кількість токенів у користувача
    const tokenCheck = checkUserTokens(userId);
    
    if (!tokenCheck.hasTokens) {
      return res.status(403).json({
        error: 'Insufficient tokens or requests',
        tokensRemaining: tokenCheck.tokensRemaining,
        requestsRemaining: tokenCheck.requestsRemaining,
      });
    }

    // Передаємо в ChatGPT та отримуємо код + кількість використаних токенів
    const { code, tokensUsed } = await processMermaidWithGPT({ mermaid, text });

    // Записуємо в БД кількість потрачених токенів (або просто віднімаємо)
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
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process Mermaid diagram',
    });
  }
};

