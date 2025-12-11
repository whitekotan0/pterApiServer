import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Схема для login/register з Firebase token
const authSchema = z.object({
  firebaseToken: z.string().min(1, 'Firebase token is required'),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  deviceInfo: z.string().max(500).optional(), // Інформація про пристрій
});

// Схема для refresh token
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  deviceInfo: z.string().max(500).optional(),
});

// Схема для logout
const logoutSchema = z.object({
  refreshToken: z.string().optional(),
  logoutAll: z.boolean().optional(),
});

export const validateAuthRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    authSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    } else {
      next(error);
    }
  }
};

export const validateRefreshRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    refreshSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    } else {
      next(error);
    }
  }
};

export const validateLogoutRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    logoutSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    } else {
      next(error);
    }
  }
};
