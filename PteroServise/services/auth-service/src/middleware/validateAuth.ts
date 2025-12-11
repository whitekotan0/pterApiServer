import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const authSchema = z.object({
  firebaseToken: z.string().min(1, 'Firebase token is required'),
  email: z.string().email().optional(),
  displayName: z.string().optional(),
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
        error: 'Validation error',
        details: error.errors,
      });
    } else {
      next(error);
    }
  }
};

