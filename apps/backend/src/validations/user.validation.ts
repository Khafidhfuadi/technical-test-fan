import { z } from 'zod';

export const getUsersQuerySchema = z.object({
  search: z.string().optional(),
  isEmailVerified: z.enum(['true', 'false']).optional(),
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().min(1).default(1)),
  limit: z.preprocess((val) => (val ? Number(val) : 10), z.number().min(1).max(100).default(10)),
});
