import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { prisma } from '../utils/prisma';
import { catchAsync } from '../utils/catchAsync';
import { redis } from '../utils/redis';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = catchAsync(async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('You are not logged in! Please log in to get access.', 401);
  }

  const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_jwt_key');

  const session = await redis.get(`session:${decoded.id}`);
  if (!session) {
    throw new AppError('Session expired. Please log in again.', 401);
  }

  const currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!currentUser) {
    throw new AppError('The user belonging to this token does no longer exist.', 401);
  }

  req.user = currentUser;
  next();
});

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Basic role authorization structure (needs roles array on User model if actually used)
    // if (!roles.includes(req.user.role)) {
    //   return next(new AppError('You do not have permission to perform this action', 403));
    // }
    next();
  };
};
