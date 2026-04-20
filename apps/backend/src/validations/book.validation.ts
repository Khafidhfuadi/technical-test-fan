import { z } from 'zod';

export const getBooksQuerySchema = z.object({
  author: z.string().optional(),
  rating: z.preprocess((val) => (val ? Number(val) : undefined), z.number().min(1).max(5).optional()),
  sortBy: z.enum(['date', 'rating']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().min(1).default(1)),
  limit: z.preprocess((val) => (val ? Number(val) : 12), z.number().min(1).max(100).default(12)),
});
