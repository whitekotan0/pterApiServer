import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // 60 секунд timeout на рівні клієнта
});

export interface ProcessMermaidRequest {
  mermaid: string;
  text?: string;
}

export interface ProcessMermaidResponse {
  code: string;
  tokensUsed: number;
}

// Retry логіка для OpenAI API
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Не повторюємо для помилок клієнта (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      // Для помилок сервера (5xx) або мережевих помилок - повторюємо
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`OpenAI API error (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

export const processMermaidWithGPT = async (
  request: ProcessMermaidRequest
): Promise<ProcessMermaidResponse> => {
  const { mermaid, text } = request;

  // Валідація вхідних даних
  if (!mermaid || mermaid.trim().length === 0) {
    throw new Error('Mermaid diagram is required');
  }

  if (mermaid.length > 10000) {
    throw new Error('Mermaid diagram is too long (max 10000 characters)');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  const systemPrompt = `Ти експерт з Mermaid діаграм. Твоя задача - обробити надану Mermaid діаграму та надати оптимізований або покращений код діаграми. Якщо надано додатковий текст з інструкціями, врахуй їх при обробці.`;

  const userPrompt = text
    ? `Ось Mermaid діаграма:\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n\nДодаткові інструкції: ${text}\n\nНадай покращений або оброблений код Mermaid діаграми.`
    : `Ось Mermaid діаграма:\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n\nНадай оптимізований код Mermaid діаграми.`;

  try {
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
    });

    const response = completion.choices[0]?.message?.content || '';
    
    if (!response) {
      throw new Error('Empty response from OpenAI');
    }
    
    // Витягуємо код з markdown блоків якщо є
    const codeBlockRegex = /```(?:mermaid)?\n?([\s\S]*?)```/;
    const match = response.match(codeBlockRegex);
    
    const code = match ? match[1].trim() : response.trim();
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      code,
      tokensUsed,
    };
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    // Більш детальна обробка помилок
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key');
    } else if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.status === 500 || error.status === 503) {
      throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    throw new Error(`Failed to process Mermaid diagram: ${error.message || 'Unknown error'}`);
  }
};
