import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err && err.name === 'ZodError') {
    statusCode = 400;
    try {
      if (err.errors && Array.isArray(err.errors)) {
        message = err.errors.map((e: any) => `${(e.path || []).join('.')}: ${e.message}`).join(', ');
      } else {
        message = err.message || 'Validation Error';
      }
    } catch (e: any) {
      message = 'Validation Error: ' + e.message;
    }
  } else if (err && err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your token has expired! Please log in again.';
  }
  // Logging removed to prevent Jest circular JSON format crash

  res.status(statusCode).json({
    error: {
      code: statusCode,
      message,
    },
  });
};
