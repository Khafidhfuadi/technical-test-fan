import { Request, Response } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { prisma } from '../utils/prisma';
import { getBooksQuerySchema, createBookSchema, updateBookSchema } from '../validations/book.validation';
import { redis } from '../utils/redis';
import crypto from 'crypto';
import { AppError } from '../utils/AppError';
import fs from 'fs';
import path from 'path';

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

export const createBook = catchAsync(async (req: any, res: Response) => {
  const data = createBookSchema.parse(req.body);
  const userId = req.user.id;
  
  const thumbnailUrl = req.file ? `/uploads/thumbnails/${req.file.filename}` : null;

  const newBook = await prisma.book.create({
    data: {
      ...data,
      thumbnailUrl,
      uploadedById: userId,
    },
  });

  const keys = await redis.keys('books:public:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  res.status(201).json({ data: newBook });
});

export const updateBook = catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const data = updateBookSchema.parse(req.body);
  const userId = req.user.id;

  const book = await prisma.book.findUnique({ where: { id } });

  if (!book) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    throw new AppError('Book not found', 404);
  }

  if (book.uploadedById !== userId) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    throw new AppError('You are not authorized to update this book', 403);
  }

  let thumbnailUrl = book.thumbnailUrl;

  if (req.file) {
    thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;
    if (book.thumbnailUrl) {
      const oldPath = path.join(__dirname, '..', '..', book.thumbnailUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
  }

  const updatedBook = await prisma.book.update({
    where: { id },
    data: {
      ...data,
      thumbnailUrl,
    },
  });

  const keys = await redis.keys('books:public:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.del(`books:detail:${id}`);

  res.status(200).json({ data: updatedBook });
});

export const deleteBook = catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  const book = await prisma.book.findUnique({ where: { id } });

  if (!book) {
    throw new AppError('Book not found', 404);
  }

  if (book.uploadedById !== userId) {
    throw new AppError('You are not authorized to delete this book', 403);
  }

  if (book.thumbnailUrl) {
    const oldPath = path.join(__dirname, '..', '..', book.thumbnailUrl);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  await prisma.book.delete({ where: { id } });

  const keys = await redis.keys('books:public:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.del(`books:detail:${id}`);

  res.status(200).json({ message: 'Book deleted successfully' });
});
