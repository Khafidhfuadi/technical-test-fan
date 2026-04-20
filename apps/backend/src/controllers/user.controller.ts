import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { prisma } from '../utils/prisma';
import { getUsersQuerySchema } from '../validations/user.validation';
import { redis } from '../utils/redis';
import crypto from 'crypto';

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
