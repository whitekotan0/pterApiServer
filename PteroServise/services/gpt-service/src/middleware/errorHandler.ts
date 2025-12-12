import { Request, Response, NextFunction } from 'express';

// Клас для створення операційних помилок
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Логування помилки
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] Error:`, {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Визначаємо статус код
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';

  // Формуємо відповідь
  const response: {
    success: false;
    error: string;
    code: string;
    timestamp: string;
    path?: string;
    stack?: string;
  } = {
    success: false,
    error: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message,
    code,
    timestamp,
  };

  // В development режимі додаємо більше інформації
  if (process.env.NODE_ENV !== 'production') {
    response.path = req.path;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Обгортка для async контролерів
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Помилки для GPT сервісу
export class InsufficientTokensError extends AppError {
  constructor(message: string = 'Insufficient tokens') {
    super(message, 403, 'INSUFFICIENT_TOKENS');
  }
}

export class OpenAIError extends AppError {
  constructor(message: string = 'OpenAI API error') {
    super(message, 503, 'OPENAI_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT');
  }
}
