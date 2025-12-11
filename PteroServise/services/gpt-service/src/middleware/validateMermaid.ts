import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const mermaidSchema = z.object({
  mermaid: z.string().min(1, 'Mermaid diagram is required'),
  text: z.string().optional(),
});

export const validateMermaidRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    mermaidSchema.parse(req.body);
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

