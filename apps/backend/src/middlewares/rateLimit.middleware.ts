import { Request, Response, NextFunction } from 'express';
import { redis } from '../utils/redis';
import { AppError } from '../utils/AppError';

export const rateLimiter = (options: { limit: number; windowSecs: number; prefix: string }) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `ratelimit:${options.prefix}:${ip}`;

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, options.windowSecs);
      }

      if (current > options.limit) {
        return next(new AppError('Too many requests, please try again later.', 429));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
