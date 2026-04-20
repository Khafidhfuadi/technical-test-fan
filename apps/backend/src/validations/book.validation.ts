import { z } from 'zod';

export const getBooksQuerySchema = z.object({
  author: z.string().optional(),
  rating: z.preprocess((val) => (val ? Number(val) : undefined), z.number().min(1).max(5).optional()),
  sortBy: z.enum(['date', 'rating']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().min(1).default(1)),
  limit: z.preprocess((val) => (val ? Number(val) : 12), z.number().min(1).max(100).default(12)),
});

export const createBookSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  author: z.string().min(2, 'Author must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  rating: z.preprocess((val) => Number(val), z.number().min(1).max(5)),
});

export const updateBookSchema = z.object({
  title: z.string().min(2).optional(),
  author: z.string().min(2).optional(),
  description: z.string().min(10).optional(),
  rating: z.preprocess((val) => (val ? Number(val) : undefined), z.number().min(1).max(5).optional()),
});
