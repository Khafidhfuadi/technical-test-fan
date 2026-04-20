import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { prisma } from '../utils/prisma';
import { getBooksQuerySchema } from '../validations/book.validation';
import { redis } from '../utils/redis';
import crypto from 'crypto';
import { AppError } from '../utils/AppError';

export const getBooks = catchAsync(async (req: Request, res: Response) => {
  const query = getBooksQuerySchema.parse(req.query);
  const { author, rating, sortBy, order, page, limit } = query;

  const queryHash = crypto.createHash('md5').update(JSON.stringify(query)).digest('hex');
  const cacheKey = `books:public:${queryHash}`;

  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  }

  const where: any = {};

  if (author) {
    where.author = { contains: author, mode: 'insensitive' };
  }

  if (rating !== undefined) {
    where.rating = { gte: rating };
  }

  const orderBy: any = {};
  if (sortBy === 'date') {
    orderBy.createdAt = order;
  } else if (sortBy === 'rating') {
    orderBy.rating = order;
  }

  const skip = (page - 1) * limit;

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        thumbnailUrl: true,
        rating: true,
        createdAt: true,
        uploadedBy: { select: { name: true } }
      },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.book.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const responseData = {
    data: books,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };

  await redis.set(cacheKey, JSON.stringify(responseData), 'EX', 120);

  res.status(200).json(responseData);
});

export const getBookById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const cacheKey = `books:detail:${id}`;

  const cachedData = await redis.get(cacheKey);
  if (cachedData) {
    return res.status(200).json({ data: JSON.parse(cachedData) });
  }

  const book = await prisma.book.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { name: true } },
    },
  });

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  await redis.set(cacheKey, JSON.stringify(book), 'EX', 300);

  res.status(200).json({ data: book });
});
