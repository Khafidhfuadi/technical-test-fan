import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { prisma } from '../utils/prisma';
import { getUsersQuerySchema, updateProfileSchema, changePasswordSchema } from '../validations/user.validation';
import { redis } from '../utils/redis';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { AppError } from '../utils/AppError';

export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const query = getUsersQuerySchema.parse(req.query);
  const { search, isEmailVerified, page, limit } = query;

  const queryHash = crypto.createHash('md5').update(JSON.stringify(query)).digest('hex');
  const cacheKey = `users:list:${queryHash}`;

  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (isEmailVerified !== undefined) {
    where.isEmailVerified = isEmailVerified === 'true';
  }

  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        isEmailVerified: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const responseData = {
    data: users,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };

  await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 60);

  res.status(200).json(responseData);
});

export const updateProfile = catchAsync(async (req: any, res: Response) => {
  const { name } = updateProfileSchema.parse(req.body);
  const userId = req.user.id;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { id: true, name: true, email: true, isEmailVerified: true },
  });

  const keys = await redis.keys('users:list:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  res.status(200).json({
    data: user,
    message: 'Profile updated successfully',
  });
});

export const changePassword = catchAsync(async (req: any, res: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    throw new AppError('Incorrect current password', 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  await redis.del(`session:${userId}`);

  res.status(200).json({ message: 'Password changed successfully' });
});
